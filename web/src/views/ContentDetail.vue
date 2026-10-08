<template>
  <div class="detail-layout">
    <div class="detail-main">
      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="content">
        <!-- 文章卡片 -->
        <article class="zh-card detail-card" :class="{ 'has-cover': content.image_path }">
          <!-- 封面/背景图（顶部大图，不影响正文阅读） -->
          <div v-if="content.image_path" class="detail-cover">
            <img :src="content.image_path" :alt="content.title" loading="lazy" />
          </div>

          <div class="detail-author">
            <router-link :to="`/u/${content.user_name}`" class="da-avatar">
              <el-avatar :size="40" :src="author?.head_photo || undefined">
                {{ (author?.nick_name || content.user_name || '?')[0] }}
              </el-avatar>
            </router-link>
            <div class="da-info">
              <router-link :to="`/u/${content.user_name}`" class="da-name">
                {{ author?.nick_name || content.user_name }}
              </router-link>
              <div class="da-meta">
                {{ content.first_publish_time }}
                <span v-if="content.top === 1" class="zh-tag">{{ t('article.top') }}</span>
              </div>
            </div>
            <div class="da-actions">
              <template v-if="userStore.isLogin && content.user_name !== userStore.user?.name">
                <button
                  class="zh-btn-plain da-btn"
                  :class="{ followed: isFollowingAuthor, mutual: isMutualAuthor }"
                  @click="toggleFollowAuthor"
                >{{ isFollowingAuthor ? (isMutualAuthor ? t('relations.mutual') : t('relations.followed')) : t('relations.follow') }}</button>
                <button class="zh-btn-primary da-btn" @click="goChat">{{ t('userpage.sendMsg') }}</button>
              </template>
              <template v-else-if="userStore.isLogin && content.user_name === userStore.user?.name">
                <!-- 作者：评论开关 -->
                <button class="zh-btn-plain da-btn" :disabled="commentSwitchLoading" @click="toggleCommentSwitch">
                  {{ content.close_comment === 1 ? t('article.openComments') : t('article.closeComments') }}
                </button>
              </template>
              <template v-else-if="!userStore.isLogin">
                <button class="zh-btn-plain da-btn" @click="router.push({ name: 'login', query: { redirect: route.fullPath } })">
                  {{ t('article.loginToInteract') }}
                </button>
              </template>
            </div>
          </div>

          <h1 class="detail-title">{{ content.title }}</h1>

          <!-- 移动端目录（折叠条） -->
          <div v-if="showCatalog && catalogItems.length > 0" class="mobile-toc">
            <div class="mobile-toc-bar" @click="mobileTocOpen = !mobileTocOpen">
              <span>{{ t('article.catalog') }}（{{ catalogItems.length }}）</span>
              <span class="mobile-toc-arrow">{{ mobileTocOpen ? '▴' : '▾' }}</span>
            </div>
            <div v-show="mobileTocOpen" class="mobile-toc-list">
              <div
                v-for="(item, idx) in catalogItems"
                :key="idx"
                class="mobile-toc-item"
                :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
                @click="scrollToHeading(item); mobileTocOpen = false"
              >{{ item.text }}</div>
            </div>
          </div>

          <!-- 所属节点（面包屑式分类标签） -->
          <div v-if="content.node_seo && detailNodeName" class="detail-node">
            <router-link :to="nodeUrl(content.user_name, content.node_seo)" class="detail-node-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span class="detail-node-label">{{ t('article.node') }}</span>
              <span>{{ detailNodeName }}</span>
            </router-link>
          </div>

          <!-- 操作栏（赞同等） -->
          <div class="detail-actions">
            <button class="zh-like-btn big" :class="{ liked: liked }" @click="coolContent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11zm19.8-10.2c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z" />
              </svg>
              <span>{{ liked ? t('article.agreed') : t('article.agree') }} {{ content.cool || 0 }}</span>
            </button>
            <button class="zh-btn-plain" @click="badContent">{{ t('article.report') }}</button>
            <button class="zh-btn-plain" @click="share">{{ t('article.share') }}</button>
          </div>

          <el-divider />

          <!-- Markdown 正文；关闭内置 medium-zoom（它只能缩放，不能切换图片），
               改由下方的 el-image-viewer 提供「相册」式浏览 -->
          <div ref="bodyWrap" class="content-body" @click="onBodyClick">
            <MdPreview
              :model-value="content.describe"
              :editor-id="'content-' + content.id"
              no-img-zoom-in
            />
          </div>

          <el-image-viewer
            v-if="viewerOpen"
            :url-list="viewerList"
            :initial-index="viewerIndex"
            hide-on-click-modal
            teleported
            @close="viewerOpen = false"
          />

          <!-- 底部：仅浏览数（赞同统一在顶部/悬浮） -->
          <div class="detail-actions bottom">
            <span class="zh-text-3">{{ t('article.views', { n: content.views || 0 }) }}</span>
          </div>

          <!-- 上一篇 / 下一篇 -->
          <div v-if="content.next || content.pre" class="pn-nav">
            <router-link v-if="content.pre" :to="contentUrl(content.pre)" class="pn-link">
              <span class="pn-label">← {{ t('article.prev') }}</span>
              <span class="pn-title">{{ content.pre.title }}</span>
            </router-link>
            <router-link v-if="content.next" :to="contentUrl(content.next)" class="pn-link right">
              <span class="pn-label">{{ t('article.next') }} →</span>
              <span class="pn-title">{{ content.next.title }}</span>
            </router-link>
          </div>

          <!-- 相关推荐（同节点） -->
          <div v-if="relatedArticles.length > 0" class="more-author">
            <div class="ma-title">{{ t('article.related') }}</div>
            <div class="ma-list">
              <router-link
                v-for="ra in relatedArticles"
                :key="ra.id"
                :to="contentUrl(ra)"
                class="ma-item"
              >
                <span class="ma-title-text">{{ ra.title }}</span>
                <span class="ma-meta">{{ ra.views || 0 }} {{ t('article.viewsShort') }} · {{ ra.cool || 0 }} {{ t('article.like') }}</span>
              </router-link>
            </div>
          </div>

        </article>

        <!-- 悬浮赞同（长文滚动后固定右下角） -->
        <transition name="fade">
          <button
            v-if="showFloatLike"
            class="float-like"
            :class="{ liked: liked }"
            @click="coolContent"
            :title="t('article.agree')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11zm19.8-10.2c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z" />
            </svg>
            <span>{{ liked ? t('article.agreed') : t('article.agree') }}</span>
            <b>{{ content.cool || 0 }}</b>
          </button>
        </transition>

        <!-- 回到顶部（长文滚动后显示） -->
        <transition name="fade">
          <button v-if="showFloatLike" class="float-top" :title="t('common.top')" @click="scrollToTop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </transition>

        <!-- 评论区 -->
        <section id="comment-section" class="zh-card comment-card">
          <div class="comment-title">
            {{ t('article.comments') }} {{ commentTotal }}
            <span v-if="content.close_comment === 1" class="comment-closed-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> {{ t('article.commentClosed') }}</span>
            <span class="comment-sorts">
              <span class="cmt-sort" :class="{ active: commentSort === '-create_time' }" @click="switchCommentSort('-create_time')">{{ t('home.latest') }}</span>
              <span class="cmt-sort" :class="{ active: commentSort === '-cool' }" @click="switchCommentSort('-cool')">{{ t('home.hot') }}</span>
            </span>
          </div>

          <div v-if="content.close_comment === 1" class="comment-closed-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>评论已关闭，暂不可发表回复
          </div>
          <div v-else-if="userStore.isLogin" class="comment-input-wrap">
            <!-- emoji 快捷按钮 -->
            <div class="cmt-emoji-bar">
              <button class="cmt-emoji-btn" :class="{ active: showCmtEmoji }" @click.stop="showCmtEmoji = !showCmtEmoji"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> {{ t('msg.sendEmoji') }}</button>
              <EmojiPicker v-if="showCmtEmoji" close-on-select @select="insertCmtEmoji" @close="showCmtEmoji = false" />
            </div>
            <el-input
              v-model="commentBody"
              type="textarea"
              :rows="3"
              :placeholder="t('article.commentPlaceholder')"
            />
            <div v-if="needCaptcha" class="comment-captcha">
              <el-input v-model="captchaCode" :placeholder="t('auth.captcha')" style="width: 140px" @keyup.enter="submitComment" />
              <img v-if="captchaImage" :src="captchaImage" class="comment-captcha-img" :title="t('common.refresh')" :placeholder="t('auth.captcha')" @click="loadCaptcha" />
            </div>
            <div class="comment-input-actions">
              <el-checkbox v-model="commentAnonymous">{{ t('article.anonymous') }}</el-checkbox>
              <button class="zh-btn-primary" :disabled="submitting" @click="submitComment">
                {{ submitting ? t('msg.sending') : t('article.publishComment') }}
              </button>
            </div>
          </div>
          <div v-else class="comment-login-tip">
            <router-link :to="{ name: 'login', query: { redirect: route.fullPath } }">{{ t('article.loginToComment') }}</router-link>
          </div>

          <el-empty v-if="comments.length === 0" :description="t('article.noComments')" :image-size="60" />

          <div
            v-for="(cm, i) in comments"
            :key="cm.id"
            :id="`cm-${cm.id}`"
            class="comment-item"
            :class="{ 'cm-flash': flashCommentId === cm.id }"
          >
            <div v-if="commentSort === '-create_time'" class="comment-floor">{{ t('article.floor', { n: floorOf(i) }) }}</div>
            <CommentNode :cm="cm" :extra="extra" :reply-disabled="replyDisabled" @reply="startReply(cm)" @deleted="onCommentDeleted" @jump="jumpToComment" />
            <!-- 回复输入框：只出现在被回复的那条顶层评论下 -->
            <div v-if="replyTo && replyTo.id === cm.id" class="reply-input">
              <el-input v-model="replyBody" type="textarea" :rows="2" :placeholder="t('article.replyPlaceholder')" />
              <div class="reply-actions">
                <button class="cmt-emoji-btn" :class="{ active: showReplyEmoji }" @click.stop="showReplyEmoji = !showReplyEmoji" :title="t('msg.sendEmoji')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>
                <EmojiPicker v-if="showReplyEmoji" close-on-select @select="insertReplyEmoji" @close="showReplyEmoji = false" />
                <el-button size="small" @click="cancelReply">{{ t('common.cancel') }}</el-button>
                <button class="zh-btn-primary" @click="submitReply">{{ t('article.reply') }}</button>
              </div>
            </div>
            <!-- 子评论（叠楼） -->
            <div
              v-if="(expandedReplies[cm.id] || cm.son) && (expandedReplies[cm.id] || cm.son).length"
              class="comment-son"
            >
              <template v-for="son in expandedReplies[cm.id] || cm.son" :key="son.id">
                <div :id="`cm-${son.id}`" class="son-item" :class="{ 'cm-flash': flashCommentId === son.id }">
                  <CommentNode
                    :cm="son"
                    :extra="extra"
                    :reply-disabled="replyDisabled"
                    @reply="startReply(son)"
                    @deleted="onCommentDeleted"
                    @jump="jumpToComment"
                  />
                  <!-- 回复输入框：只出现在被回复的那条楼中楼评论下 -->
                  <div v-if="replyTo && replyTo.id === son.id" class="reply-input son-reply">
                    <el-input v-model="replyBody" type="textarea" :rows="2" :placeholder="t('article.replyPlaceholder')" />
                    <div class="reply-actions">
                      <button class="cmt-emoji-btn" :class="{ active: showReplyEmoji }" @click.stop="showReplyEmoji = !showReplyEmoji" :title="t('msg.sendEmoji')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>
                      <EmojiPicker v-if="showReplyEmoji" close-on-select @select="insertReplyEmoji" @close="showReplyEmoji = false" />
                      <el-button size="small" @click="cancelReply">{{ t('common.cancel') }}</el-button>
                      <button class="zh-btn-primary" @click="submitReply">{{ t('article.reply') }}</button>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 查看更多回复 -->
              <div v-if="!expandedReplies[cm.id] && cm.son_num > (cm.son || []).length" class="more-replies">
                <button class="more-btn" @click="loadAllReplies(cm)">
                  {{ t('article.viewReplies', { n: cm.son_num }) }}
                </button>
              </div>
            </div>
            <div
              v-else-if="!expandedReplies[cm.id] && cm.son_num > 0"
              class="more-replies"
            >
              <button class="more-btn" @click="loadAllReplies(cm)">
                {{ t('article.viewReplies', { n: cm.son_num }) }}
              </button>
            </div>
          </div>

          <div v-if="commentPage < commentTotalPages" class="load-more">
            <button class="load-more-btn" @click="loadMoreComments">{{ t('article.viewAllComments') }}</button>
          </div>
          <div v-else-if="commentTotal > 5" class="all-loaded">
            {{ t('article.allCommentsLoaded', { n: commentTotal }) }}
          </div>
        </section>
      </template>

      <!-- 密码保护 -->
      <div v-else-if="needPassword" class="zh-card pwd-lock">
        <div class="lock-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3>{{ t('article.passwordRequired') }}</h3>
        <p class="zh-text-3">{{ t('article.passwordHint') }}</p>
        <div class="lock-input">
          <el-input
            v-model="pwdInput"
            type="password"
            show-password
            :placeholder="t('article.passwordPlaceholder')"
            style="width: 260px"
            @keyup.enter="submitPassword"
          />
          <button class="zh-btn-primary" :disabled="pwdChecking" @click="submitPassword">
            {{ pwdChecking ? t('common.verifying') : t('article.unlock') }}
          </button>
        </div>
      </div>

      <el-empty v-else-if="banNotice" :title="t('article.contentBanned')" />
      <el-empty v-else :title="t('article.contentNotFound')" />
    </div>

    <!-- 右侧作者信息卡 -->
    <aside v-if="content" class="detail-side">
      <!-- 长文目录 -->
      <div v-if="showCatalog" class="zh-card catalog-card">
        <div class="catalog-title">{{ t('article.catalog') }}</div>
        <div class="catalog-list">
          <div
            v-for="(item, idx) in catalogItems"
            :key="idx"
            class="catalog-item"
            :class="{ active: activeCatalog === idx }"
            :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
            @click="scrollToHeading(item)"
          >{{ item.text }}</div>
          <el-empty v-if="catalogItems.length === 0" :title="t('article.untitled')" :image-size="30" />
        </div>
      </div>

      <div class="zh-card side-card">
        <div class="side-author">
          <router-link :to="`/u/${content.user_name}`">
            <el-avatar :size="56" :src="author?.head_photo || undefined">
              {{ (author?.nick_name || content.user_name || '?')[0] }}
            </el-avatar>
          </router-link>
          <div class="side-author-name">{{ author?.nick_name || content.user_name }}</div>
          <div class="side-author-desc">{{ author?.short_describe || t('userpage.noBio') }}</div>
          <div class="side-stats">
            <div><b>{{ author?.content_num || 0 }}</b><span>{{ t('user.content') }}</span></div>
            <div><b>{{ author?.followed_num || 0 }}</b><span>{{ t('user.followers') }}</span></div>
          </div>
          <router-link :to="`/u/${content.user_name}`" class="zh-btn-plain side-visit">{{ t('article.enterProfile') }}</router-link>
        </div>
      </div>
    </aside>

    <!-- 举报对话框 -->
    <ReportDialog v-model:visible="reportVisible" @confirm="handleReport" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import request from '@/api'
import { t } from '@/i18n'
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import { formatTime } from '@/utils/format'
import CommentNode from '@/components/CommentNode.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import { fetchMyFans } from '@/utils/relation'
import { nodeUrl, contentUrl } from '@/utils/url'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const site = useSiteStore()
// 地址：/u/:name/node/:nodeSeo/:seo
// 文章 SEO 只在所属节点内唯一，定位一篇文章需要「用户名 + 节点 SEO + 文章 SEO」三者。
const isSeoMode = computed(() => !!(route.params.seo && route.params.nodeSeo))
// 加载成功后由接口回填，用于评论/点赞等按 id 的接口
const contentId = ref(0)

function loadQuery() {
  return {
    id: 0,
    user_name: route.params.name,
    node_seo: route.params.nodeSeo,
    seo: route.params.seo,
    password: pwdInput.value,
    more: true
  }
}

const loading = ref(true)
const content = ref(null)

// ============ 正文图片：相册式浏览（点击任意图片可左右切换） ============
const bodyWrap = ref(null)
const viewerOpen = ref(false)
const viewerList = ref([])
const viewerIndex = ref(0)

// 收集正文内全部图片的 URL（只取正文，不含头像/封面等页面其它 img）
function collectBodyImages() {
  const root = bodyWrap.value
  if (!root) return []
  const preview = root.querySelector('.md-editor-preview') || root
  return [...preview.querySelectorAll('img')]
    .map((img) => img.getAttribute('src'))
    .filter(Boolean)
}

function onBodyClick(e) {
  const img = e.target.closest && e.target.closest('img')
  if (!img) return
  const list = collectBodyImages()
  if (list.length === 0) return
  viewerList.value = list
  viewerIndex.value = Math.max(0, list.indexOf(img.getAttribute('src')))
  viewerOpen.value = true
}

const author = ref(null)
const needPassword = ref(false)
const banNotice = ref(false)
const pwdInput = ref('')
const pwdChecking = ref(false)
const liked = ref(false)
const reportVisible = ref(false)
const isFollowingAuthor = ref(false)
const isMutualAuthor = ref(false)
const commentSwitchLoading = ref(false)
// 长文目录（正文超长时显示，自实现）
const showCatalog = ref(false)
const catalogItems = ref([])
// 右侧目录当前阅读章节高亮
const activeCatalog = ref(-1)
// 移动端目录折叠
const mobileTocOpen = ref(false)

// 从 Markdown 正文解析标题（## 一、…）
function parseCatalog(describe) {
  const items = []
  const lines = (describe || '').split('\n')
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (m) {
      items.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, '').trim() })
    }
  }
  return items
}

// 点击目录：滚动到对应标题
function scrollToHeading(item) {
  const headings = [...document.querySelectorAll('.md-editor h1, .md-editor h2, .md-editor h3')]
  const el = headings.find((h) => h.textContent.trim() === item.text)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 文章所属节点名称
const detailNodeName = ref('')
// 悬浮赞同（滚动超过 400px 显示）
const showFloatLike = ref(false)
// 文章关闭评论后，已有评论的回复按钮置灰
const replyDisabled = computed(() => content.value?.close_comment === 1)

const comments = ref([])
const extra = reactive({ users: {}, comments: {}, contents: {} })
const commentTotal = ref(0)
const commentPage = ref(1)
const commentLimit = 10
const commentTotalPages = ref(0)

const commentBody = ref('')
const showCmtEmoji = ref(false)

function insertCmtEmoji(e) {
  commentBody.value = commentBody.value ? commentBody.value + e : e
}
const commentAnonymous = ref(false)
const submitting = ref(false)
const replyTo = ref(null)
const replyBody = ref('')
const showReplyEmoji = ref(false)

function insertReplyEmoji(e) {
  replyBody.value = replyBody.value ? replyBody.value + e : e
}
// 评论验证码（风险触发：近期评论过频繁才要求，正常用户无感）
const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')
const captchaCode = ref('')

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image
  } catch (e) {
    // 静默
  }
}
// 评论排序：最新 / 热门
const commentSort = ref('-create_time')

function switchCommentSort(s) {
  if (commentSort.value === s) return
  commentSort.value = s
  loadComments(1)
}
// 楼层号：按时间正序固定编号（最早=1 楼，最新=N 楼），列表逆序展示
// 当前页第 i 条（0-based）楼号 = 顶层总数 - 已加载条数 - i
function floorOf(i) {
  const loaded = (commentPage.value - 1) * commentLimit
  return Math.max(commentTotal.value - loaded - i, 1)
}

function startReply(cm) {
  replyTo.value = cm
  // 不自动带 @，正文由用户自由输入；引用条已显示"回复 @xxx"
}

function cancelReply() {
  replyTo.value = null
  replyBody.value = ''
}

// 加载作者信息 + 关注状态（登录时）
async function loadAuthor() {
  if (!content.value?.user_name) return
  try {
    const u = await request.post('/app/u/info', { user_name: content.value.user_name })
    author.value = u.data
  } catch (e) {}
  if (userStore.isLogin) {
    try {
      const [f, fans] = await Promise.all([
        request.post('/api/relation/following/me', { limit: 100, page: 1 }),
        fetchMyFans()
      ])
      isFollowingAuthor.value = (f.data?.relations || []).some(
        (r) => r.user_b_id === content.value.user_id
      )
      isMutualAuthor.value = isFollowingAuthor.value && fans.has(content.value.user_id)
    } catch (e) {}
  }
}

async function loadContent() {
  try {
    const res = await request.post('/app/content', loadQuery())
    needPassword.value = false
    content.value = res.data
    contentId.value = res.data.id
    // 页面标题用文章标题（SEO）
    document.title = res.data.title ? `${res.data.title} - ${site.siteTitle}` : site.siteTitle
    // 长文才显示目录
    showCatalog.value = (res.data.describe || '').length > 2000
    if (showCatalog.value) catalogItems.value = parseCatalog(res.data.describe)
    // 节点名称（/u/node）
    if (res.data.node_seo) {
      try {
        const nr = await request.post('/app/u/node', { user_name: res.data.user_name, seo: res.data.node_seo })
        // 隐藏节点对非作者不可见：取不到名字就不显示节点标签，
        // 不要退回显示 SEO 字符串（那会让人误以为它是节点名）
        detailNodeName.value = nr.data?.name || ''
      } catch (e) {
        detailNodeName.value = ''
      }
    }
    // SEO meta description
    let desc = (res.data.describe || '').replace(/[#>*`\[\]()!-]/g, '').replace(/\s+/g, ' ').trim()
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = (desc || res.data.title || site.siteTitle).slice(0, 160)
    await loadAuthor()
    await loadRelated()
  } catch (e) {
    if (e.id === 110001) {
      // 密码保护/密码错误
      content.value = null
      needPassword.value = true
      if (pwdInput.value) {
        ElMessage.error('密码错误，请重试')
      }
    } else if (e.id === 110002) {
      // 已被封禁
      content.value = null
      needPassword.value = false
      banNotice.value = true
    } else {
      content.value = null
      needPassword.value = false
    }
  }
}

// 提交密码解锁
async function submitPassword() {
  if (!pwdInput.value) {
    ElMessage.warning(t('article.enterPassword'))
    return
  }
  pwdChecking.value = true
  try {
    const res = await request.post('/app/content', loadQuery())
    needPassword.value = false
    content.value = res.data
    contentId.value = res.data.id
    // 页面标题用文章标题（SEO）
    document.title = res.data.title ? `${res.data.title} - ${site.siteTitle}` : site.siteTitle
    // 解锁后加载作者信息 + 评论列表（否则作者卡 fallback、评论列表为空）
    await Promise.all([loadAuthor(), loadComments(1), loadRelated()])
  } catch (e) {
    if (e.id === 110001) {
      ElMessage.error('密码错误')
    } else {
      ElMessage.error(e.msg || t('common.loadFailed'))
    }
  } finally {
    pwdChecking.value = false
  }
}

async function loadComments(p = 1, append = false) {
  // 文章 id 未就绪（SEO 路由解析中）时不请求，避免后端 content_id empty
  if (!contentId.value) return
  commentPage.value = p
  try {
    const res = await request.post('/app/content/comment', {
      content_id: contentId.value,
      root_comment_id: 0,
      sort: [commentSort.value],
      limit: commentLimit,
      page: p
    })
    const list = res.data.comments || []
    comments.value = append ? [...comments.value, ...list] : list
    Object.assign(extra.users, res.data.extra?.users || {})
    Object.assign(extra.comments, res.data.extra?.comments || {})
    Object.assign(extra.contents, res.data.extra?.contents || {})
    commentTotal.value = res.data.total || 0
    commentTotalPages.value = res.data.total_pages || 0
  } catch (e) {
    comments.value = []
  }
}

// 加载更多（追加下一页）
function loadMoreComments() {
  loadComments(commentPage.value + 1, true)
}

// 评论删除后刷新
function onCommentDeleted() {
  loadComments(1)
}

async function coolContent() {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await request.post('/api/content/cool', { id: contentId.value })
    if (liked.value) {
      liked.value = false
      content.value.cool = (content.value.cool || 0) - 1
    } else {
      liked.value = true
      content.value.cool = (content.value.cool || 0) + 1
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function badContent() {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    return
  }
  reportVisible.value = true
}

async function handleReport(reason) {
  try {
    await request.post('/api/content/bad', { id: contentId.value, reason })
    ElMessage.success(t('article.reportSuccess'))
  } catch (e) {
    if (e.id === 110012) {
      ElMessage.warning(t('report.reported'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  }
}

async function toggleFollowAuthor() {
  try {
    if (isFollowingAuthor.value) {
      await request.post('/api/relation/follow/minute', {
        user_id: content.value.user_id,
        user_name: content.value.user_name
      })
      isFollowingAuthor.value = false
      isMutualAuthor.value = false
      if (author.value) author.value.followed_num = Math.max((author.value.followed_num || 0) - 1, 0)
      ElMessage.success(t('common.unfollowSuccess'))
    } else {
      await request.post('/api/relation/follow/add', {
        user_id: content.value.user_id,
        user_name: content.value.user_name
      })
      isFollowingAuthor.value = true
      isMutualAuthor.value = (await fetchMyFans()).has(content.value.user_id)
      if (author.value) author.value.followed_num = (author.value.followed_num || 0) + 1
      ElMessage.success(t('common.followSuccess'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

// 作者开关评论
async function toggleCommentSwitch() {
  if (!content.value) return
  const target = content.value.close_comment === 1 ? 0 : 1
  commentSwitchLoading.value = true
  try {
    await request.post('/api/content/update/comment', {
      id: content.value.id,
      close_comment: target
    })
    content.value.close_comment = target
    ElMessage.success(target === 1 ? '已关闭评论' : '已开启评论')
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    commentSwitchLoading.value = false
  }
}

function goChat() {
  router.push({ path: '/user/messages', query: { peer: content.value.user_id } })
}

// 相关推荐（同节点最近 3 篇，排除当前）
const relatedArticles = ref([])

async function loadRelated() {
  if (!content.value?.user_name || !content.value?.node_id) return
  try {
    const res = await request.post('/app/u/content', {
      user_name: content.value.user_name,
      node_id: content.value.node_id,
      limit: 4,
      page: 1,
      sort: ['=id', '=top', '=sort_num', '-first_publish_time', '-publish_time', '-create_time', '-update_time', '-views', '=comment_num', '=bad', '=cool', '=seo']
    })
    relatedArticles.value = (res.data.contents || []).filter((c) => c.id !== content.value.id).slice(0, 3)
  } catch (e) {
    relatedArticles.value = []
  }
}

function share() {
  navigator.clipboard?.writeText(window.location.href)
  ElMessage.success(t('common.linkCopied'))
}

// 展开的一级评论全部回复（腾讯音乐式叠楼）
const expandedReplies = ref({})

async function loadAllReplies(cm) {
  try {
    const res = await request.post('/app/content/comment', {
      content_id: contentId.value,
      root_comment_id: cm.id,
      sort: [commentSort.value],
      limit: 50,
      page: 1
    })
    const list = res.data.comments || []
    // 合并关联数据（用户/评论内容/被回复引用）
    Object.assign(extra.users, res.data.extra?.users || {})
    Object.assign(extra.comments, res.data.extra?.comments || {})
    Object.assign(extra.contents, res.data.extra?.contents || {})
    expandedReplies.value = { ...expandedReplies.value, [cm.id]: list }
  } catch (e) {
    ElMessage.error(e.msg || '加载回复失败')
  }
}

async function submitComment() {
  if (!commentBody.value.trim()) {
    ElMessage.warning(t('article.enterComment'))
    return
  }
  submitting.value = true
  try {
    const payload = {
      content_id: contentId.value,
      comment_id: 0,
      is_to_comment: false,
      body: commentBody.value,
      anonymous: commentAnonymous.value
    }
    if (needCaptcha.value) {
      payload.captcha_id = captchaId.value
      payload.captcha_code = captchaCode.value
    }
    await request.post('/api/comment/create', payload)
    ElMessage.success(t('article.commentSuccess'))
    commentBody.value = ''
    needCaptcha.value = false
    captchaCode.value = ''
    await loadComments(1)
  } catch (e) {
    if (e.id === 100031) {
      needCaptcha.value = true
      captchaCode.value = ''
      await loadCaptcha()
      ElMessage.warning(t('article.commentCaptcha'))
    } else if (e.id === 100032) {
      captchaCode.value = ''
      await loadCaptcha()
      ElMessage.error(t('auth.captchaPlaceholder'))
    } else {
      ElMessage.error(e.msg || '评论失败')
    }
  } finally {
    submitting.value = false
  }
}

async function submitReply() {
  if (!replyBody.value.trim()) {
    ElMessage.warning(t('article.enterReply'))
    return
  }
  if (!replyTo.value) return
  submitting.value = true
  const target = replyTo.value
  const targetTopId = target.root_comment_id || target.id // 所属顶层评论 id
  try {
    const payload = {
      content_id: contentId.value,
      comment_id: target.id,
      is_to_comment: true,
      body: replyBody.value,
      anonymous: false
    }
    if (needCaptcha.value) {
      payload.captcha_id = captchaId.value
      payload.captcha_code = captchaCode.value
    }
    await request.post('/api/comment/create', payload)
  } catch (e) {
    if (e.id === 100031) {
      needCaptcha.value = true
      captchaCode.value = ''
      await loadCaptcha()
      ElMessage.warning(t('article.commentCaptcha'))
      submitting.value = false
      return
    } else if (e.id === 100032) {
      captchaCode.value = ''
      await loadCaptcha()
      ElMessage.error(t('auth.captchaPlaceholder'))
      submitting.value = false
      return
    }
    ElMessage.error(e.msg || '回复失败')
    submitting.value = false
    return
  }
  ElMessage.success(t('article.replySuccess'))
  needCaptcha.value = false
  captchaCode.value = ''
  cancelReply()
  // 刷新该层（失败静默，不影响回复结果）
  try {
    await loadComments(commentPage.value)
    if (target.root_comment_id && expandedReplies.value[targetTopId]) {
      await loadAllReplies({ id: targetTopId })
    }
  } catch (e) {}
  // 滚动定位到新回复（楼中楼滚到该评论，顶层滚到该楼）
  nextTick(() => {
    const el = document.getElementById(`cm-${target.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  submitting.value = false
}

// 点击楼中楼的引用块：跳到被回复的那条评论（把目标写进地址，方便分享/刷新后仍定位）
const flashCommentId = ref(0)
let flashTimer = null

async function jumpToComment(commentId) {
  const cid = Number(commentId)
  if (!cid) return
  if (Number(route.query.comment) !== cid) {
    await router.push({ query: { ...route.query, comment: String(cid) } })
  }
  await handleCommentAnchor()
  flashComment(cid)
}

// 跳过去之后短暂高亮一下，让读者看清落在哪条评论上
function flashComment(commentId) {
  flashCommentId.value = Number(commentId)
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashCommentId.value = 0
    flashTimer = null
  }, 1800)
}

// 通知带 ?comment= 锚点：定位到对应评论（楼中楼则展开所属顶层并定位）
async function handleCommentAnchor() {
  const cid = Number(route.query.comment)
  if (!cid) return
  // 文章 id 未就绪时直接返回，避免带空 content_id 去请求评论
  if (!contentId.value) return
  let topId = cid
  // 楼中楼评论：查询所属顶层 id
  if (userStore.isLogin) {
    try {
      const r = await request.post('/api/comment/take', { id: cid })
      const cm = r.data?.comment
      if (cm?.root_comment_id) topId = cm.root_comment_id
    } catch (e) {}
  }
  // 当前页没有目标顶层：按时间排序时二分定位到它所在页
  if (!document.getElementById(`cm-${topId}`) && commentSort.value === '-create_time' && commentTotalPages.value > 1) {
    const page = await locateCommentPage(topId)
    if (page > 0) await loadComments(page)
  }
  // 目标在楼中楼：展开该顶层全部回复
  if (topId !== cid) {
    try {
      await loadAllReplies({ id: topId })
    } catch (e) {}
  }
  nextTick(() => {
    let el = document.getElementById(`cm-${cid}`)
    if (!el) el = document.getElementById(`cm-${topId}`)
    const found = el
    if (!el) el = document.getElementById('comment-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (found) flashComment(found.id.replace('cm-', ''))
  })
}

// 二分查找目标顶层评论所在页码（顶层按 -create_time 倒序）
async function locateCommentPage(topId) {
  let targetTime = 0
  try {
    const r = await request.post('/api/comment/take', { id: topId })
    targetTime = r.data?.extra?.comments?.[topId]?.create_time || 0
    if (!targetTime) targetTime = r.data?.comment?.create_time || 0
  } catch (e) {}
  if (!targetTime) return 0
  let lo = 1
  let hi = commentTotalPages.value
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    let page = []
    let extras = {}
    try {
      const res = await request.post('/app/content/comment', {
        content_id: contentId.value,
        root_comment_id: 0,
        sort: [commentSort.value],
        limit: commentLimit,
        page: mid
      })
      page = res.data.comments || []
      extras = res.data.extra?.comments || {}
    } catch (e) {}
    if (page.length === 0) {
      hi = mid - 1
      continue
    }
    const first = extras[page[0].id]?.create_time || 0
    const last = extras[page[page.length - 1].id]?.create_time || 0
    if (!first || !last) return 0
    if (first < targetTime) hi = mid - 1
    else if (last > targetTime) lo = mid + 1
    else return mid
  }
  return lo <= commentTotalPages.value ? lo : commentTotalPages.value
}

// 详情页之间跳转（组件复用）时重新加载。
// 注意：这里 watch 的是 path（文章身份）而不是 params 数组——返回新数组的取值函数
// 引用每次都变，导致仅改 query（如点评论写入 ?comment=xx）也会触发，把 contentId
// 清零后紧接着的评论请求就带上了空 content_id（后端报 100010 参数错误）。
watch(
  () => route.path,
  async () => {
    loading.value = true
    content.value = null
    banNotice.value = false
    comments.value = []
    contentId.value = 0
    await loadContent()
    await loadComments(1)
    loading.value = false
    handleCommentAnchor()
  }
)

// 悬浮赞同按钮：滚动超过一定距离显示
function onScroll() {
  showFloatLike.value = window.scrollY > 400
  updateActiveCatalog()
}

// 右侧目录：高亮当前正在阅读的章节（scrollspy）
function updateActiveCatalog() {
  if (!showCatalog.value || !catalogItems.value.length) {
    activeCatalog.value = -1
    return
  }
  const headings = [...document.querySelectorAll('.md-editor h1, .md-editor h2, .md-editor h3')]
  let cur = -1
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].getBoundingClientRect().top <= 100) cur = i
    else break
  }
  if (cur < 0) {
    activeCatalog.value = -1
    return
  }
  const t = headings[cur].textContent.trim()
  const idx = catalogItems.value.findIndex((it) => it.text === t)
  if (idx !== activeCatalog.value) {
    activeCatalog.value = idx
    // 目录卡片内部会滚动（长文可上百条）：让高亮项始终留在可视区域里，
    // 否则读者滚到文章中部时，高亮项还在卡片视口下方一两千像素处，等于没有指示。
    nextTick(() => keepActiveCatalogVisible())
  }
}

// 让当前高亮目录项出现在目录卡片的可视区域内（只在需要时滚动，避免抖动）
function keepActiveCatalogVisible() {
  const card = document.querySelector('.catalog-card')
  const item = card?.querySelector('.catalog-item.active')
  if (!card || !item) return
  const cardRect = card.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  const pad = 8
  if (itemRect.top < cardRect.top + pad) {
    card.scrollTop -= cardRect.top + pad - itemRect.top
  } else if (itemRect.bottom > cardRect.bottom - pad) {
    card.scrollTop += itemRect.bottom - (cardRect.bottom - pad)
  }
}

// 回到文章开头
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  await loadContent()
  await loadComments(1)
  loading.value = false
  handleCommentAnchor()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.detail-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* 悬浮赞同（小红书式圆形按钮） */
.float-like {
  position: fixed;
  right: 40px;
  bottom: 60px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border: none;
  border-radius: 999px;
  background: var(--zh-blue);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(255, 95, 87, 0.35);
  transition: all 0.2s;
}

.float-like:hover {
  background: var(--zh-blue-hover);
  transform: translateY(-2px);
}

.float-like.liked {
  background: #fff;
  color: var(--zh-blue);
  border: 1px solid var(--zh-blue);
}

.float-like b {
  font-size: 15px;
}

/* 回到顶部（圆形按钮，在赞同按钮上方） */
.float-top {
  position: fixed;
  right: 44px;
  bottom: 128px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: var(--zh-text-2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.float-top:hover {
  color: var(--zh-blue);
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.detail-main {
  flex: 1;
  min-width: 0;
}

.detail-card {
  padding: 32px 36px;
}

/* 有封面时裁剪圆角，让封面贴边 */
.detail-card.has-cover {
  overflow: hidden;
  padding-top: 0;
}

.detail-cover {
  margin: 0 -36px 20px;
  height: 320px;
  overflow: hidden;
  background: #faf8f6;
}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (max-width: 768px) {
  .detail-cover {
    height: 180px;
    margin: 0 -16px 16px;
  }
}

/* 上一篇/下一篇 */
.pn-nav {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f5f0ed;
}

.pn-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #faf8f6;
  text-decoration: none;
  transition: background 0.2s;
  min-width: 0;
}

.pn-link:hover {
  background: #fff3f1;
}

.pn-link.right {
  text-align: right;
  align-items: flex-end;
}

.pn-label {
  color: var(--zh-text-3);
  font-size: 12px;
}

.pn-title {
  color: var(--zh-text);
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.pn-link:hover .pn-title {
  color: var(--zh-blue);
}

/* 作者的其他文章 */
.more-author {
  margin-top: 20px;
}

.ma-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.ma-list {
  display: flex;
  flex-direction: column;
}

.ma-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}

.ma-item:hover {
  background: #fff3f1;
}

.ma-title-text {
  font-size: 14px;
  color: var(--zh-text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ma-item:hover .ma-title-text {
  color: var(--zh-blue);
}

.ma-meta {
  color: var(--zh-text-3);
  font-size: 12px;
  flex-shrink: 0;
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.da-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--zh-text);
}

.da-meta {
  color: var(--zh-text-3);
  font-size: 13px;
  margin-top: 2px;
}

.da-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.da-btn {
  padding: 4px 14px;
  font-size: 13px;
}

.detail-node {
  margin: 0 0 16px;
}

.detail-node-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff7f5;
  border: 1px solid #ffe4e1;
  color: var(--zh-blue);
  font-size: 13px;
  text-decoration: none;
  transition: all 0.15s;
}

.detail-node-label {
  color: var(--zh-text-3);
  font-size: 12px;
}

.detail-node-tag:hover {
  background: var(--zh-blue);
  border-color: var(--zh-blue);
  color: #fff;
}

.detail-node-tag:hover .detail-node-label {
  color: rgba(255, 255, 255, 0.85);
}

.detail-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.45;
  margin-bottom: 18px;
}

/* ===== 文章正文排版（专业阅读体验） ===== */
.detail-card :deep(.md-editor) {
  color: var(--zh-text);
  font-size: 16px;
  line-height: 1.8;
  word-break: break-word;
}

.detail-card :deep(.md-editor p) {
  margin: 0 0 16px;
}

.detail-card :deep(.md-editor h1),
.detail-card :deep(.md-editor h2),
.detail-card :deep(.md-editor h3),
.detail-card :deep(.md-editor h4) {
  color: var(--zh-text);
  font-weight: 700;
  line-height: 1.4;
  margin: 28px 0 14px;
}

.detail-card :deep(.md-editor h1) { font-size: 22px; }
.detail-card :deep(.md-editor h2) {
  font-size: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--zh-border);
}
.detail-card :deep(.md-editor h3) { font-size: 18px; }
.detail-card :deep(.md-editor h4) { font-size: 16px; }

.detail-card :deep(.md-editor a) {
  color: var(--zh-blue);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 95, 87, 0.3);
}
.detail-card :deep(.md-editor a:hover) { color: var(--zh-blue-hover); }

.detail-card :deep(.md-editor img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px auto;
}

.detail-card :deep(.md-editor blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid var(--zh-blue);
  background: #fff7f5;
  color: var(--zh-text-2);
  border-radius: 0 8px 8px 0;
}

.detail-card :deep(.md-editor code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  background: #f6f1ed;
  color: #e0483e;
  padding: 2px 6px;
  border-radius: var(--zh-radius);
}

.detail-card :deep(.md-editor pre) {
  margin: 16px 0;
  padding: 16px;
  background: #2b2b2b;
  color: #f8f8f2;
  border-radius: 8px;
  overflow-x: auto;
  line-height: 1.6;
}
.detail-card :deep(.md-editor pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: 13px;
}

.detail-card :deep(.md-editor ul),
.detail-card :deep(.md-editor ol) {
  margin: 0 0 16px;
  padding-left: 24px;
}
.detail-card :deep(.md-editor li) { margin: 6px 0; }

.detail-card :deep(.md-editor table) {
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
}
.detail-card :deep(.md-editor th),
.detail-card :deep(.md-editor td) {
  border: 1px solid var(--zh-border);
  padding: 8px 12px;
}
.detail-card :deep(.md-editor th) { background: #faf7f5; }

.detail-card :deep(.md-editor hr) {
  border: none;
  border-top: 1px solid var(--zh-border);
  margin: 24px 0;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-actions.bottom {
  margin-top: 24px;
  margin-bottom: 0;
}

.zh-like-btn.big {
  padding: 7px 18px;
  font-size: 15px;
}

.comment-card {
  padding: 20px 24px;
}

.comment-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.comment-sorts {
  margin-left: 16px;
  display: inline-flex;
  gap: 10px;
  font-size: 13px;
  font-weight: 400;
}

.cmt-sort {
  color: var(--zh-text-3);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--zh-radius);
}

.cmt-sort:hover {
  color: var(--zh-blue);
}

.cmt-sort.active {
  color: var(--zh-blue);
  font-weight: 600;
  background: #fff3f1;
}

.comment-closed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--zh-text-3);
  margin-left: 8px;
}

.comment-closed-tip {
  padding: 18px 0;
  text-align: center;
  color: var(--zh-text-3);
  font-size: 14px;
  background: #faf7f5;
  border-radius: 6px;
  margin-bottom: 16px;
}

/* QQ 音乐式楼层号 */
.comment-floor {
  font-size: 12px;
  color: var(--zh-text-3);
  margin: 2px 0 0 36px;
}

.comment-floor::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 11px;
  background: var(--zh-blue);
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: -1px;
}

.comment-input-wrap {
  margin-bottom: 16px;
  background: #faf7f5;
  border: 1px solid var(--zh-border);
  border-radius: var(--zh-radius);
  padding: 12px;
}

.cmt-emoji-bar {
  position: relative;
  margin-bottom: 6px;
}

.cmt-emoji-btn {
  border: none;
  background: none;
  color: var(--zh-text-3);
  font-size: 13px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--zh-radius);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cmt-emoji-btn:hover,
.cmt-emoji-btn.active {
  color: var(--zh-blue);
  background: #fff3f1;
}

.comment-input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.comment-captcha {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.comment-captcha-img {
  height: 32px;
  width: 100px;
  border-radius: 6px;
  border: 1px solid #f0e9e3;
  cursor: pointer;
  object-fit: cover;
}

.comment-login-tip {
  padding: 12px 0;
  margin-bottom: 12px;
  color: var(--zh-blue);
}

.reply-input {
  margin: 8px 0 8px 44px;
  padding: 10px;
  background: #faf7f5;
  border-radius: var(--zh-radius);
}

.reply-input.son-reply {
  margin-left: 76px;
}

.reply-actions {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.comment-son {
  margin-left: 44px;
  border-left: 2px solid #f5f0ed;
  padding-left: 16px;
}

.pwd-lock {
  padding: 48px 24px;
  text-align: center;
}

.lock-icon {
  color: #b5aea8;
  margin-bottom: 8px;
}

.pwd-lock h3 {
  margin-bottom: 4px;
}

.lock-input {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}

.load-more {
  text-align: center;
  padding: 12px 0;
}

.load-more-btn {
  border: 1px solid var(--zh-blue);
  background: #fff;
  color: var(--zh-blue);
  padding: 6px 24px;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover {
  background: var(--zh-blue);
  color: #fff;
}

.all-loaded {
  text-align: center;
  color: var(--zh-text-3);
  font-size: 13px;
  padding: 10px 0;
}

.more-replies {
  margin: 8px 0 8px 44px;
}

.more-btn {
  border: none;
  background: none;
  color: var(--zh-blue);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
}

.more-btn:hover {
  text-decoration: underline;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}

.zh-tag {
  display: inline-block;
  padding: 0 6px;
  border: 1px solid #ff665e;
  color: #ff665e;
  font-size: 12px;
  border-radius: 2px;
  margin-left: 8px;
}

/* 右侧作者卡 */
/* 长文目录 */
.catalog-card {
  padding: 14px 16px;
  margin-bottom: 12px;
  max-height: 420px;
  overflow-y: auto;
}

.catalog-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--zh-text);
}

.catalog-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.catalog-item {
  font-size: 13px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: var(--zh-radius);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-item:hover {
  color: var(--zh-blue);
  background: #fff3f1;
}

.catalog-card :deep(.md-editor-catalog) {
  background: transparent;
}

/* 桌面端：隐藏移动端折叠目录条（它只在 ≤768px 显示） */
.mobile-toc {
  display: none;
}

.catalog-item.active {
  color: #e0564a;
  font-weight: 500;
  background: #ffece9;
}

/* 点击目录平滑滚动时标题不被顶部导航遮挡 */
.detail-card :deep(.md-editor) h1,
.detail-card :deep(.md-editor) h2,
.detail-card :deep(.md-editor) h3 {
  scroll-margin-top: 90px;
}

.detail-side {
  width: 260px;
  flex-shrink: 0;
  /* 整个右侧栏吸顶：长文滚动时目录与作者卡跟随到文章底部 */
  position: sticky;
  top: 70px;
  align-self: flex-start;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
}

.side-card {
  padding: 20px;
  text-align: center;
}

.side-author-name {
  font-size: 17px;
  font-weight: 700;
  margin-top: 10px;
}

.side-author-desc {
  color: var(--zh-text-3);
  font-size: 13px;
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.side-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 14px 0;
}

.side-stats b {
  display: block;
  font-size: 17px;
}

.side-stats span {
  color: var(--zh-text-3);
  font-size: 13px;
}

.side-visit {
  width: 100%;
}

@media (max-width: 768px) {
  /* 移动端阅读体验：缩小内边距 + 标题，让正文更舒展 */
  .detail-card {
    padding: 16px 16px 20px;
  }

  .detail-title {
    font-size: 22px;
    margin-bottom: 14px;
  }

  .comment-card {
    padding: 16px;
  }

  .detail-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .zh-like-btn.big {
    padding: 6px 14px;
    font-size: 14px;
  }

  /* 上一篇/下一篇：移动端竖排，避免两列挤压 */
  .pn-nav {
    flex-direction: column;
  }

  .pn-link.right {
    text-align: left;
    align-items: flex-start;
  }

  /* 移动端折叠目录条（侧栏隐藏后替代入口） */
  .mobile-toc {
    display: block;
    background: #fff3f1;
    border: 1px solid #ffd9d5;
    border-radius: 8px;
    margin: 12px 0;
    overflow: hidden;
  }

  .mobile-toc-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--zh-text);
    cursor: pointer;
    user-select: none;
  }

  .mobile-toc-arrow {
    color: var(--zh-blue);
    font-size: 12px;
  }

  .mobile-toc-list {
    max-height: 320px;
    overflow-y: auto;
    border-top: 1px dashed #ffd9d5;
    padding: 6px 8px;
  }

  .mobile-toc-item {
    font-size: 13px;
    color: var(--zh-text-2);
    cursor: pointer;
    padding: 6px 8px;
    border-radius: var(--zh-radius);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-toc-item:active {
    color: var(--zh-blue);
    background: #ffe4e1;
  }

.detail-side {
    display: none;
  }
}

/* 跳到某条评论时短暂高亮，便于确认落点 */
.comment-item.cm-flash,
.son-item.cm-flash {
  animation: cmFlash 1.8s ease-out;
  border-radius: var(--zh-radius);
}

@keyframes cmFlash {
  0% { background: #fff3f1; box-shadow: 0 0 0 2px #ffd9d3 inset; }
  60% { background: #fff8f7; box-shadow: 0 0 0 2px #ffe8e4 inset; }
  100% { background: transparent; box-shadow: none; }
}
</style>
