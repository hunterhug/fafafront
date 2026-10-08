<template>
  <div class="relations-page">
    <div class="zh-card rel-top">
      <router-link :to="backTarget" class="rel-back">← {{ t('relations.back') }}</router-link>
      <div class="rel-title">{{ displayName }} 的{{ type === 'fans' ? t('relations.fans') : t('relations.following') }}</div>
      <div class="rel-tabs">
        <router-link :to="`/u/${name}/fans`" class="rel-tab" :class="{ active: type === 'fans' }">
          {{ t('relations.fans') }} <b>{{ fansCount }}</b>
        </router-link>
        <router-link :to="`/u/${name}/follows`" class="rel-tab" :class="{ active: type === 'follows' }">
          {{ t('relations.following') }} <b>{{ followsCount }}</b>
        </router-link>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="users.length === 0" :description="t('relations.empty')" :image-size="60" />
      <div v-else class="zh-card rel-list">
        <div v-for="u in users" :key="u.id" class="rel-user">
          <!-- 点击头像/信息 -> 进入对方首页 -->
          <div class="rel-user-main" @click="$router.push(`/u/${u.name}`)">
            <el-avatar
              :size="48"
              :src="thumbUrl(u.head_photo)"
              @error="(e) => fallbackAvatar(e, u)"
            >
              {{ (u.nick_name || u.name || '?')[0] }}
            </el-avatar>
            <div class="rel-user-info">
              <div class="rel-user-name">
                {{ u.nick_name || u.name }}
                <el-tag v-if="u.is_vip" size="small" type="success" style="margin-left: 4px">VIP</el-tag>
              </div>
              <div v-if="u.short_describe" class="rel-user-bio">{{ u.short_describe }}</div>
              <div class="rel-user-desc">@{{ u.name }} · {{ t('relations.fans') }} {{ u.followed_num || 0 }} · {{ t('relations.following') }} {{ u.following_num || 0 }}</div>
            </div>
          </div>
          <button
            v-if="userStore.isLogin && u.name !== userStore.user?.name"
            class="follow-btn"
            :class="{ following: u.is_following, mutual: u.is_mutual }"
            :disabled="u._following"
            @click="toggleRelationFollow(u)"
          >
            <template v-if="u.is_following">
              <span class="fb-text">{{ u.is_mutual ? t('relations.mutual') : t('relations.followed') }}</span>
              <span class="fb-text-hover">{{ t('relations.unfollow') }}</span>
            </template>
            <template v-else>{{ t('relations.follow') }}</template>
          </button>
        </div>
      </div>
      <!-- 分页：加载更多 / 加载中 / 到底了 -->
      <div v-if="loadingMore" class="rel-more">{{ t('common.loading') }}</div>
      <div v-else-if="hasMore" class="rel-more" @click="loadMore">{{ t('relations.loaded', { cur: users.length, total: total }) }}</div>
      <div v-else-if="users.length > 0" class="rel-end">— {{ t('home.noMore') }} —</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'
import { useUserStore } from '@/store/user'
import { fetchMyFans } from '@/utils/relation'

const route = useRoute()
const userStore = useUserStore()

const name = computed(() => route.params.name)
const type = computed(() => (route.path.endsWith('/fans') ? 'fans' : 'follows'))

const users = ref([])
const loading = ref(true)
const fansCount = ref(0)
const followsCount = ref(0)
// 页面标题用昵称（登录名仅用于 URL/@）
const displayName = ref('')
// 我的粉丝 id 集合（用于判断互相关注）
const myFans = ref(new Set())

// 分页状态
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)

// 返回目标：从哪里点进来就回哪里（记录进入本页时的来源），无来源时回该用户主页
const backTarget = ref('')

async function load(reset = true) {
  if (reset) {
    page.value = 1
    users.value = []
    loading.value = true
  } else {
    loadingMore.value = true
  }
  await ensureMyFans()
  const isFollowed = type.value === 'fans'
  try {
    const res = await request.post(
      isFollowed ? '/api/relation/followed/list' : '/api/relation/following/list',
      {
        user_a_id: 0,
        user_a_name: isFollowed ? '' : name.value,
        user_b_id: 0,
        user_b_name: isFollowed ? name.value : '',
        limit: 50,
        page: page.value,
        sort: ['=id', '=user_a_id', '=user_b_id', '-create_time']
      }
    )
    const usersMap = res.data.users || {}
    const relations = res.data.relations || []
    const targetIds = new Set(relations.map((r) => (isFollowed ? r.user_a_id : r.user_b_id)))
    const list = Object.values(usersMap).filter((u) => targetIds.has(u.id))
    users.value = reset ? list : [...users.value, ...list]
    total.value = res.data.total || users.value.length
    hasMore.value = users.value.length < total.value

    // 粉丝数/关注数 + 页面标题昵称（公开接口补）
    await refreshCounts()

    // 补充每个人的粉丝数/关注数（关系接口不含计数，用公开接口补）
    await Promise.all(
      list.map(async (u) => {
        try {
          const info = await request.post('/app/u/info', { user_name: u.name })
          u.followed_num = info.data?.followed_num || 0
          u.following_num = info.data?.following_num || 0
          u.short_describe = info.data?.short_describe || ''
        } catch (e) {}
      })
    )
    // 标记我是否已关注列表中的用户 + 互相关注（对方是否关注我）
    if (userStore.isLogin) {
      try {
        const f = await request.post('/api/relation/following/me', { limit: 100, page: 1 })
        const followed = new Set((f.data?.relations || []).map((r) => r.user_b_id))
        list.forEach((u) => {
          u.is_following = followed.has(u.id)
          u.is_mutual = followed.has(u.id) && myFans.value.has(u.id)
        })
      } catch (e) {}
    }
  } catch (e) {
    if (reset) users.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载"我的粉丝"集合（互相关注判断用），只在登录时拉一次
async function ensureMyFans() {
  if (!userStore.isLogin) return
  if (myFans.value.size > 0) return
  myFans.value = await fetchMyFans()
}

function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  page.value += 1
  load(false)
}

// 刷新顶部粉丝/关注计数（关注/取关操作后调用）
async function refreshCounts() {
  try {
    const info = await request.post('/app/u/info', { user_name: name.value })
    fansCount.value = info.data?.followed_num || 0
    followsCount.value = info.data?.following_num || 0
    displayName.value = info.data?.nick_name || name.value
  } catch (e) {
    displayName.value = name.value
  }
}

// 头像缩略图 / 回退
function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

function fallbackAvatar(e, u) {
  // 缩略图（/storage_x/）加载失败：换回原图并阻止 el-avatar 的字母占位
  if (u.head_photo) {
    e.target.src = u.head_photo
    e.target.onerror = null
    return false
  }
  return true
}

async function toggleRelationFollow(u) {
  u._following = true
  try {
    if (u.is_following) {
      await request.post('/api/relation/follow/minute', { user_id: u.id, user_name: u.name })
      u.is_following = false
      u.is_mutual = false
      ElMessage.success(t('common.unfollowSuccess'))
    } else {
      await request.post('/api/relation/follow/add', { user_id: u.id, user_name: u.name })
      u.is_following = true
      u.is_mutual = myFans.value.has(u.id)
      ElMessage.success(t('common.followSuccess'))
    }
    // 关注/取关后刷新顶部计数（自己在自己的页面操作时数量会变）
    await refreshCounts()
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    u._following = false
  }
}

watch([name, type], () => load(true))
onMounted(() => {
  // 组件首次挂载时记录来源；页面内切 tab 不影响（仍回最初来源）
  backTarget.value = window.history.state?.back || `/u/${name.value}`
  load(true)
})
</script>

<style scoped>
.relations-page {
  max-width: 720px;
  margin: 0 auto;
}

.rel-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  margin-bottom: 12px;
}

.rel-back {
  color: var(--zh-text-3);
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
}

.rel-back:hover {
  color: var(--zh-blue);
}

.rel-title {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.rel-tabs {
  display: flex;
  gap: 16px;
}

.rel-tab {
  font-size: 14px;
  color: var(--zh-text-2);
  text-decoration: none;
  padding: 6px 4px;
}

.rel-tab:hover {
  color: var(--zh-blue);
}

.rel-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 2px solid var(--zh-blue);
}

.rel-list {
  padding: 8px 0;
}

.rel-more {
  text-align: center;
  padding: 14px 0 4px;
  color: var(--zh-blue);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.rel-more:hover {
  color: #ff8a75;
}

.rel-end {
  text-align: center;
  padding: 14px 0 4px;
  color: var(--zh-text-3);
  font-size: 12px;
  letter-spacing: 0.1em;
}

.rel-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #f5f0ed;
}

.rel-user:last-child {
  border-bottom: none;
}

.rel-user:hover {
  background: #fff8f5;
}

.rel-user-main {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.rel-user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--zh-text);
  display: flex;
  align-items: center;
}

.rel-user-bio {
  color: var(--zh-text-2);
  font-size: 13px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.rel-user-desc {
  color: #9b9491;
  font-size: 12px;
  margin-top: 2px;
}

.follow-btn {
  border: 1px solid var(--zh-blue);
  background: #fff;
  color: var(--zh-blue);
  border-radius: 999px;
  padding: 5px 18px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.follow-btn:hover {
  background: var(--zh-blue);
  color: #fff;
}

/* 已关注：灰色实心，hover 变"取消关注"（参考小红书等社交 APP） */
.follow-btn.following {
  background: #f0f0f0;
  border-color: #e0dcd9;
  color: #9b9491;
}

/* 互相关注：珊瑚红实心白字 */
.follow-btn.mutual {
  background: var(--zh-blue);
  border-color: var(--zh-blue);
  color: #fff;
}

.follow-btn.mutual:hover {
  background: #fff;
  color: var(--zh-blue);
}

.follow-btn.following .fb-text-hover {
  display: none;
}

.follow-btn.following:hover {
  background: #fff;
  border-color: var(--zh-blue);
  color: var(--zh-blue);
}

.follow-btn.following:hover .fb-text {
  display: none;
}

.follow-btn.following:hover .fb-text-hover {
  display: inline;
}

.follow-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
