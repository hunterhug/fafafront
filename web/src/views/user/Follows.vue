<template>
  <el-card class="follows-card">
    <template #header>{{ t('user.follows') }}</template>
    <el-tabs v-model="tab" @tab-change="load(1)">
      <el-tab-pane :label="t('user.myFollowing')" name="following" />
      <el-tab-pane :label="t('user.myFollowers')" name="followed" />
    </el-tabs>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="users.length === 0" :description="t('common.noData')" :image-size="60" />
      <el-row :gutter="14">
        <el-col v-for="u in users" :key="u.id" :xs="24" :sm="12" :md="8">
          <el-card class="user-card" shadow="hover">
            <div class="user-head" @click="goUser(u)">
              <el-avatar :size="44" :src="thumbUrl(u.head_photo)" @error="(e) => fallbackAvatar(e, u)">
                {{ (u.nick_name || u.name || '?')[0] }}
              </el-avatar>
              <div class="user-info">
                <div class="nick-row">
                  <span class="nick">{{ u.nick_name || u.name }}</span>
                  <el-tag v-if="u.is_vip" type="success" size="small">VIP</el-tag>
                </div>
                <div class="uname">@{{ u.name }}</div>
              </div>
            </div>
            <div class="user-foot">
              <span class="ustats">{{ u.short_describe || t('user.followingOn') }}</span>
              <!-- 我关注的：互相关注/取消关注 -->
              <el-button
                v-if="tab === 'following'"
                size="small"
                :type="u.is_mutual ? 'primary' : 'danger'"
                :plain="!u.is_mutual"
                @click="unfollow(u)"
              >{{ u.is_mutual ? t('relations.mutual') : t('relations.unfollow') }}</el-button>
              <!-- 关注我的：关注/已关注/互相关注 -->
              <el-button
                v-else
                size="small"
                :type="u.is_following ? 'default' : 'primary'"
                :class="{ 'is-mutual': u.is_mutual }"
                @click="followBack(u)"
              >{{ u.is_mutual ? t('relations.mutual') : u.is_following ? t('relations.followed') : t('relations.follow') }}</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-pagination
        v-if="totalPages > 1"
        class="pager"
        layout="prev, pager, next"
        :total="total"
        :page-size="limit"
        :current-page="page"
        @current-change="load"
      />
    </template>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'
import { fetchMyFans } from '@/utils/relation'

const router = useRouter()
const tab = ref('following')
const users = ref([])
const loading = ref(true)
const page = ref(1)
const limit = 12
const total = ref(0)
const totalPages = ref(0)

async function load(p = 1) {
  loading.value = true
  page.value = p
  const isFollowing = tab.value === 'following'
  const q = {
    limit,
    page: p,
    sort: ['=id', '=user_a_id', '=user_b_id', '-create_time']
  }
  try {
    const [res, myFans, myFollows] = await Promise.all([
      request.post(isFollowing ? '/api/relation/following/me' : '/api/relation/followed/me', q),
      fetchMyFans(),
      fetchMyFollowing()
    ])
    // 后端返回 users 是对象 {id: UserHelper}，只保留 relations 目标（排除自己，与官网粉丝页一致）
    const usersMap = res.data.users || {}
    const relations = res.data.relations || []
    const targetIds = new Set(relations.map((r) => (isFollowing ? r.user_b_id : r.user_a_id)))
    const list = Object.values(usersMap).filter((u) => targetIds.has(u.id))
    list.forEach((u) => {
      u.is_following = myFollows.has(u.id) // 我是否已关注
      u.is_mutual = myFollows.has(u.id) && myFans.has(u.id) // 互相关注
    })
    users.value = list
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    users.value = []
  } finally {
    loading.value = false
  }
}

// 我关注了谁（id 集合，分页拉全）
let myFollowsCache = null
async function fetchMyFollowing() {
  if (myFollowsCache) return myFollowsCache
  const set = new Set()
  let page = 1
  const limit = 100
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let res
    try {
      res = await request.post('/api/relation/following/me', { limit, page })
    } catch (e) {
      break
    }
    const rels = res.data?.relations || []
    rels.forEach((r) => set.add(r.user_b_id))
    const total = res.data?.total || 0
    if (page * limit >= total || rels.length === 0) break
    page += 1
  }
  myFollowsCache = set
  return set
}

async function unfollow(u) {
  try {
    await request.post('/api/relation/follow/minute', { user_id: u.id, user_name: u.name })
    ElMessage.success(t('common.unfollowSuccess'))
    myFollowsCache = null
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

// 关注我的：回关（我还没关注的人）
async function followBack(u) {
  if (u.is_following) return
  try {
    await request.post('/api/relation/follow/add', { user_id: u.id, user_name: u.name })
    ElMessage.success(t('common.followSuccess'))
    myFollowsCache = null
    u.is_following = true
    u.is_mutual = (await fetchMyFans()).has(u.id)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function goUser(u) {
  if (u.name) router.push(`/u/${u.name}`)
}

// 头像缩略图（/storage/ → /storage_x/），失败回退原图
function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

function fallbackAvatar(e, u) {
  if (u.head_photo) {
    e.target.src = u.head_photo
    e.target.onerror = null
    return false
  }
  return true
}

onMounted(() => load(1))
</script>

<style scoped>
.user-card {
  margin-bottom: 14px;
}

.user-head {
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.nick-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nick {
  font-size: 15px;
  font-weight: 600;
}

.uname {
  color: var(--zh-text-3);
  font-size: 12px;
}

.user-foot {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ustats {
  color: var(--zh-text-3);
  font-size: 12px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
</style>
