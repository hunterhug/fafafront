<template>
  <!-- 全屏写作（Teleport 到 body，脱离个人中心布局，获得最大书写空间） -->
  <Teleport to="body">
    <ContentEditor
      v-if="editingId !== 0"
      :content-id="editingId === -1 ? 0 : editingId"
      @close="onEditorClose"
      @created="onEditorCreated"
    />
  </Teleport>

  <div v-if="editingId === 0" class="manage-page">
    <!-- 左侧：节点树（可折叠，给编辑器更大空间） -->
    <div class="manage-side" :class="{ collapsed: treeCollapsed }">
      <div class="side-head">
        <span class="side-title">{{ t('article.node') }}</span>
        <el-button size="small" text type="primary" @click="openNodeDialog(0)">{{ t('manage.new') }}</el-button>
        <el-button size="small" text class="collapse-btn" :title="treeCollapsed ? t('manage.expandNodeTree') : t('manage.collapseNodeTree')" @click="treeCollapsed = !treeCollapsed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: treeCollapsed ? 'rotate(180deg)' : '' }"><path d="M15 18l-6-6 6-6"/></svg>
        </el-button>
      </div>

      <div class="tree-wrap">
        <div
          class="tree-all"
          :class="{ active: selectedNodeId === 0 }"
          @click="selectNode(0)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>{{ t('userpage.allContent') }}</span>
          <span class="count">{{ allCount }}</span>
        </div>

        <div class="node-list">
          <!-- 父节点拖拽排序（handle 拖把手，点击行选中节点） -->
          <draggable
            v-model="nodes"
            item-key="id"
            handle=".drag-handle"
            class="node-draggable"
            ghost-class="drag-ghost"
            :delay="150"
            :touch-start-threshold="10"
            :force-fallback="true"
            @change="onNodeDragChange"
          >
            <template #item="{ element: node }">
              <div class="node-group">
                <div
                  class="node-row parent"
                  :class="{ active: selectedNodeId === node.id }"
                  @click="selectNode(node.id)"
                >
                  <span class="drag-handle" :title="t('editor.dragSort')">⠿</span>
                  <span class="node-name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {{ node.name }}</span>
                  <span v-if="node.status === 1" class="node-hidden-tag">{{ t('nodes.hiddenTag') }}</span>
                  <span class="node-num">{{ node.content_num }}</span>
                  <span class="node-ops" @click.stop>
                    <el-button size="small" text @click="moveNode(node, -1, true)">↑</el-button>
                    <el-button size="small" text @click="moveNode(node, 1, true)">↓</el-button>
                    <el-button size="small" text type="primary" @click="openNodeDialog(node.id, true)">{{ t('manage.addChild') }}</el-button>
                    <el-button size="small" text type="primary" @click="openNodeDialog(node.id, false, node)">{{ t('manage.edit') }}</el-button>
                    <el-button size="small" text type="warning" :title="t('nodes.hiddenTip')" @click="toggleNodeStatus(node)">
                      {{ node.status === 1 ? t('admin.show') : t('admin.hidden') }}
                    </el-button>
                    <el-button size="small" text type="danger" @click="deleteNode(node)">{{ t('manage.delete') }}</el-button>
                  </span>
                </div>
                <!-- 子节点拖拽排序 -->
                <draggable
                  v-model="node.son"
                  item-key="id"
                  handle=".son-drag-handle"
                  class="node-son-draggable"
                  ghost-class="drag-ghost"
                  :delay="150"
                  :touch-start-threshold="10"
            :force-fallback="true"
                  @change="(evt) => onSonDragChange(evt, node)"
                >
                  <template #item="{ element: son }">
                    <div
                      class="node-row son"
                      :class="{ active: selectedNodeId === son.id }"
                      @click="selectNode(son.id)"
                    >
                      <span class="son-drag-handle" :title="t('editor.dragSort')">⠿</span>
                      <span class="node-name">└ {{ son.name }}</span>
                      <span v-if="son.status === 1" class="node-hidden-tag">{{ t('nodes.hiddenTag') }}</span>
                      <span class="node-num">{{ son.content_num }}</span>
                      <span class="node-ops" @click.stop>
                        <el-button size="small" text @click="moveNode(son, -1, false)">↑</el-button>
                        <el-button size="small" text @click="moveNode(son, 1, false)">↓</el-button>
                        <el-button size="small" text type="primary" @click="openNodeDialog(son.id, false, son)">{{ t('manage.edit') }}</el-button>
                        <el-button size="small" text type="warning" :title="t('nodes.hiddenTip')" @click="toggleNodeStatus(son)">
                          {{ son.status === 1 ? t('admin.show') : t('admin.hidden') }}
                        </el-button>
                        <el-button size="small" text type="danger" @click="deleteNode(son)">{{ t('manage.delete') }}</el-button>
                      </span>
                    </div>
                  </template>
                </draggable>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <el-alert
        v-if="userStore.isLogin && !userStore.isVip"
        type="warning"
        :closable="false"
        show-icon
        :title="t('manage.onlyVipNode')"
        style="margin-top: 12px"
      />
    </div>

    <!-- 右侧：文章列表 -->
    <div class="manage-main">
      <div class="main-head">
        <span class="main-title">{{ selectedNodeName }}</span>
        <div class="main-filters">
          <el-button size="small" type="primary" @click="editingId = -1">{{ t('user.write') }}</el-button>
          <el-input
            v-model="keyword"
            size="small"
            :placeholder="t('manage.searchArticle')"
            clearable
            style="width: 210px"
            @keyup.enter="loadArticles(1)"
            @clear="loadArticles(1)"
          />
          <el-select v-model="statusFilter" size="small" style="width: 110px" @change="loadArticles(1)">
            <el-option :label="t('common.all')" value="-1" />
            <el-option :label="t('admin.published')" value="published" />
            <el-option :label="t('editor.draft')" value="draft" />
            <el-option :label="t('admin.hidden')" value="hidden" />
            <el-option :label="t('admin.rubbish')" value="rubbish" />
          </el-select>
          <el-select v-model="sortMode" size="small" style="width: 110px" @change="loadArticles(1)">
            <el-option :label="t('manage.sortManual')" value="manual" />
            <el-option :label="t('manage.sortUpdate')" value="update" />
            <el-option :label="t('manage.sortCreate')" value="create" />
          </el-select>
          <span v-if="sortMode === 'manual' && selectedNodeId === 0" class="sort-hint">{{ t('manage.sortHintAll') }}</span>
          <span v-else-if="sortMode === 'manual' && selectedNodeId !== 0" class="sort-hint">{{ t('manage.sortHintNode') }}</span>
          <span v-else class="sort-hint">{{ t('manage.sortTimeHint') }}</span>
        </div>
      </div>

      <el-skeleton v-if="loading" :rows="6" animated />

      <template v-else>
        <el-empty v-if="articles.length === 0" :description="t('manage.noArticles')" :image-size="60" />

        <!-- 拖拽排序列表（仅手动排序且选中具体节点时启用） -->
        <draggable
          v-model="articles"
          item-key="id"
          handle=".drag-handle"
          class="article-list"
          ghost-class="drag-ghost"
          :disabled="selectedNodeId === 0 || sortMode !== 'manual'"
          :delay="150"
          :touch-start-threshold="10"
          :force-fallback="true"
          @change="onArticleDragChange"
        >
          <template #item="{ element: row }">
            <div class="article-item" :class="{ rubbish: row.status === 3 }">
              <span v-if="sortMode === 'manual' && selectedNodeId !== 0 && row.top !== 1" class="drag-handle" :title="t('editor.dragSort')">⠿</span>
              <div class="art-body">
                <div class="art-head">
                  <a
                    class="art-title"
                    @click="editingId = row.id"
                  >{{ row.pre_title || row.title || t('article.untitled') }}</a>
                  <span class="art-tags">
                    <el-tag v-if="row.top === 1" size="small" type="danger">{{ t('article.top') }}</el-tag>
                    <el-tag v-if="row.version === 0" size="small" type="info">{{ t('admin.unpublished') }}</el-tag>
                    <el-tag v-else-if="row.pre_flush === 0" size="small" type="warning">{{ t('manage.draftPending') }}</el-tag>
                    <el-tag v-else size="small" type="success">v{{ row.version }}</el-tag>
                    <el-tag v-if="row.status === 1" size="small" type="warning">{{ t('admin.hidden') }}</el-tag>
                    <el-tag v-if="row.status === 2" size="small" type="danger">{{ t('admin.banned') }}</el-tag>
                    <el-tag v-if="row.password" size="small" type="warning">{{ t('manage.encrypted') }}</el-tag>
                    <el-tag v-if="row.close_comment === 1" size="small">{{ t('manage.closeComment') }}</el-tag>
                  </span>
                </div>
                <div class="art-meta">
                  <span v-if="sortMode === 'manual'">{{ t('admin.sort') }} {{ row.sort_num }}</span>
                  <span class="art-stat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{{ row.views || 0 }} · <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11z"/><path d="M21.8 9.8c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z"/></svg>{{ row.cool || 0 }} · <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>{{ row.comment_num || 0 }}</span>
                  <span>{{ t('manage.updated') }} {{ formatTime(row.update_time).slice(0, 16) }}</span>
                  <span v-if="row.first_publish_time" class="first-pub">{{ t('manage.firstPublish') }} {{ formatTime(row.first_publish_time).slice(0, 16) }}</span>
                </div>
              </div>
              <div class="art-actions">
                <template v-if="row.status !== 3">
                  <el-button size="small" text class="art-sort-btn" :disabled="selectedNodeId === 0 || sortMode !== 'manual' || row.top === 1" :title="t('admin.moveUp')" @click="moveArticle(row, -1)">↑</el-button>
                  <el-button size="small" text class="art-sort-btn" :disabled="selectedNodeId === 0 || sortMode !== 'manual' || row.top === 1" :title="t('admin.moveDown')" @click="moveArticle(row, 1)">↓</el-button>
                  <el-button size="small" @click="editingId = row.id">{{ t('common.edit') }}</el-button>
                  <el-button
                    v-if="row.pre_flush === 0"
                    size="small"
                    type="success"
                    @click="publish(row)"
                  >{{ t('editor.publish') }}</el-button>
                  <el-button size="small" type="danger" plain @click="toRubbish(row)">{{ t('common.delete') }}</el-button>
                  <el-dropdown trigger="click" @command="(cmd) => onMoreCmd(cmd, row)">
                    <el-button size="small">{{ t('manage.more') }}</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-if="row.version > 0" command="history">{{ t('admin.history') }}</el-dropdown-item>
                        <el-dropdown-item command="top">{{ row.top === 1 ? t('manage.cancelTop') : t('article.top') }}</el-dropdown-item>
                        <el-dropdown-item command="hide">{{ row.status === 1 ? t('admin.show') : t('admin.hidden') }}</el-dropdown-item>
                        <el-dropdown-item command="move">{{ t('manage.move') }}</el-dropdown-item>
                        <el-dropdown-item command="seo">SEO</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
                <template v-else>
                  <el-button size="small" type="success" plain @click="recycle(row)">{{ t('manage.restore') }}</el-button>
                  <el-button size="small" type="danger" @click="reallyDelete(row)">{{ t('manage.deleteForever') }}</el-button>
                </template>
              </div>
            </div>
          </template>
        </draggable>

        <el-pagination
          v-if="totalPages > 1"
          class="pager"
          layout="prev, pager, next"
          :total="total"
          :page-size="limit"
          :current-page="page"
          @current-change="loadArticles"
        />
      </template>
    </div>

    <!-- 节点创建/编辑对话框 -->
    <el-dialog v-model="nodeDialogVisible" :title="nodeEditId ? t('manage.editNode') : t('manage.newNode')" width="440px">
      <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeRules" label-width="80px">
        <el-form-item :label="t('admin.name')" prop="name">
          <el-input v-model="nodeForm.name" />
        </el-form-item>
        <el-form-item prop="seo">
          <template #label>
            <span>SEO
              <el-tooltip placement="top" :content="t('nodes.seoTip')" raw-content>
                <span class="prop-help">?</span>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="nodeForm.seo" :placeholder="t('manage.seo')" />
        </el-form-item>
        <el-form-item :label="t('admin.desc')">
          <el-input v-model="nodeForm.describe" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="nodeSaving" @click="saveNode">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 移动文章到其他节点 -->
    <el-dialog v-model="moveDialogVisible" :title="t('manage.moveArticle')" width="460px">
      <p class="move-tip" style="color: var(--zh-text-3); font-size: 13px; margin-bottom: 10px">
        {{ t('manage.moveTo', { title: moveTarget?.pre_title || moveTarget?.title }) }}
      </p>
      <div class="move-node-tree">
        <template v-for="node in nodes" :key="'t' + node.id">
          <div
            class="mv-node"
            :class="{ active: moveTargetNodeId === node.id }"
            @click="moveTargetNodeId = node.id"
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {{ node.name }}</div>
          <div
            v-for="son in node.son || []"
            :key="son.id"
            class="mv-node son"
            :class="{ active: moveTargetNodeId === son.id }"
            @click="moveTargetNodeId = son.id"
          >└ {{ son.name }}</div>
        </template>
      </div>
      <template #footer>
        <el-button @click="moveDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="moving" @click="confirmMove">{{ t('manage.move') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑文章 SEO -->
    <el-dialog v-model="seoDialogVisible" :title="t('manage.editSeo')" width="440px">
      <p class="move-tip" style="color: var(--zh-text-3); font-size: 13px; margin-bottom: 10px">
        {{ t('manage.seoOf', { title: seoTarget?.pre_title || seoTarget?.title }) }}
      </p>
      <el-input v-model="seoForm" :placeholder="t('editor.seoPlaceholder')" />
      <template #footer>
        <el-button @click="seoDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="seoSaving" @click="confirmSeo">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 历史版本弹窗（文章列表直接看发布历史） -->
    <ContentHistoryDialog v-model:visible="historyVisible" :content-id="historyContentId" @restored="onHistoryRestored" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import request from '@/api'
import { genSeo } from '@/utils/seo'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'
import ContentEditor from '@/components/ContentEditor.vue'
import ContentHistoryDialog from '@/components/ContentHistoryDialog.vue'

const userStore = useUserStore()

/* ---------- 编辑器状态（飞书式：左树 + 右编辑同屏） ---------- */
// editingId: 0=列表模式，-1=新建，>0=编辑该文章
const editingId = ref(0)

function onEditorClose() {
  editingId.value = 0
  loadArticles(1)
  loadNodes()
}

function onEditorCreated(id) {
  // 新建成功后切换到编辑该文章，并刷新列表
  editingId.value = id
  loadArticles(1)
  loadNodes()
}

/* ---------- 历史版本弹窗（列表里直接看发布历史） ---------- */
const historyVisible = ref(false)
const historyContentId = ref(0)

function openHistory(row) {
  historyContentId.value = row.id
  historyVisible.value = true
}

function onHistoryRestored() {
  loadArticles(1)
}

/* ---------- 节点树 ---------- */
const nodes = ref([])
const selectedNodeId = ref(0)
const allCount = ref(0)
const treeCollapsed = ref(false)

const selectedNodeName = computed(() => {
  if (selectedNodeId.value === 0) return t('manage.allArticles')
  const find = (list) => {
    for (const n of list) {
      if (n.id === selectedNodeId.value) return n.name
      if (n.son) {
        const r = find(n.son)
        if (r) return r
      }
    }
    return ''
  }
  return find(nodes.value) || t('manage.article')
})

/* ---------- 文章列表 ---------- */
const articles = ref([])
const loading = ref(true)
const page = ref(1)
const limit = 20
const total = ref(0)
const totalPages = ref(0)
const statusFilter = ref('-1')
const keyword = ref('')
// 列表排序：manual=置顶+手动 sort_num（默认，拖拽可用）/ update=更新时间倒序 / create=创建时间倒序
const sortMode = ref('manual')

async function loadNodes() {
  try {
    const res = await request.post('/api/node/list', {
      sort: ['=id', '+sort_num', '-create_time', '-update_time', '+status', '=seo']
    })
    nodes.value = res.data.nodes || []
  } catch (e) {
    nodes.value = []
  }
}

// 强制所有节点展开（二级直接可见）

function selectNode(id) {
  selectedNodeId.value = id
  loadArticles(1)
}

function buildQuery(p) {
  const q = {
    limit,
    page: p,
    // 后台排序（sort 数组项须命中后端 ContentSortName 白名单）
    sort: [],
    node_id: selectedNodeId.value || 0,
    top: -1,
    password_type: -1,
    close_comment: -1,
    publish_type: -1,
    title: keyword.value.trim()
  }
  if (sortMode.value === 'update') {
    // 按更新时间倒序
    q.sort = ['=id', '-top', '-update_time', '=user_id', '-create_time', '=comment_num', '=bad', '=cool', '=version', '+status', '=seo']
  } else if (sortMode.value === 'create') {
    // 按首次发布时间倒序
    q.sort = ['=id', '-top', '-first_publish_time', '=user_id', '-update_time', '-create_time', '=comment_num', '=bad', '=cool', '=version', '+status', '=seo']
  } else {
    // 默认：置顶优先 + 手动排序号（不用热度/时间）
    q.sort = ['=id', '-top', '+sort_num', '=user_id', '-create_time', '=comment_num', '=bad', '=cool', '=version', '+status', '=seo']
  }
  switch (statusFilter.value) {
    case 'published':
      q.status = -1
      q.publish_type = 1
      break
    case 'draft':
      q.status = -1
      q.publish_type = 0
      break
    case 'hidden':
      q.status = 1
      break
    case 'rubbish':
      q.status = 3
      break
    default:
      q.status = -1
  }
  return q
}

async function loadArticles(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/content/list', buildQuery(p))
    articles.value = res.data.contents || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
    if (selectedNodeId.value === 0) {
      allCount.value = res.data.total || 0
    }
  } catch (e) {
    articles.value = []
  } finally {
    loading.value = false
  }
}

/* ---------- 拖拽排序 ---------- */
// 通用保存排序：把 xid 放到 yid 后面（yid=0 表示放到最前）
async function saveSort(xid, yid, api) {
  try {
    await request.post(api, { xid, yid: yid || 0 })
    ElMessage.success(t('manage.sortSaved'))
  } catch (e) {
    ElMessage.error(e.msg || t('admin.sortFailed'))
  }
}

// 文章拖拽（vuedraggable @change：moved.element 是被拖的文章）
function onArticleDragChange(evt) {
  if (!evt.moved) return
  const xid = evt.moved.element.id
  const newIdx = evt.moved.newIndex
  const yid = newIdx > 0 ? articles.value[newIdx - 1]?.id : 0
  saveSort(xid, yid, '/api/content/sort').then(() => loadArticles(page.value))
}

// 父节点拖拽
function onNodeDragChange(evt) {
  if (!evt.moved) return
  const xid = evt.moved.element.id
  const newIdx = evt.moved.newIndex
  const yid = newIdx > 0 ? nodes.value[newIdx - 1]?.id : 0
  saveSort(xid, yid, '/api/node/sort').then(() => loadNodes())
}

// 子节点拖拽（parentNode 为所属父节点）
function onSonDragChange(evt, parentNode) {
  if (!evt.moved) return
  const xid = evt.moved.element.id
  const newIdx = evt.moved.newIndex
  const sonList = parentNode.son || []
  const yid = newIdx > 0 ? sonList[newIdx - 1]?.id : 0
  saveSort(xid, yid, '/api/node/sort').then(() => loadNodes())
}

/* ---------- 文章操作 ---------- */
async function publish(row) {
  try {
    await request.post('/api/content/publish', { id: row.id })
    ElMessage.success(t('editor.publishSuccess'))
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('editor.publishFail'))
  }
}

async function toggleTop(row) {
  try {
    await request.post('/api/content/update/top', { id: row.id, top: row.top === 1 ? 0 : 1 })
    ElMessage.success(t('manage.topUpdated'))
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function toggleHide(row) {
  try {
    const status = row.status === 1 ? 0 : 1
    await request.post('/api/content/update/status', { id: row.id, status })
    ElMessage.success(status === 1 ? t('manage.hiddenDone') : t('manage.shownDone'))
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

// 「更多」下拉命令分发（历史/置顶/隐藏/移动/SEO）
function onMoreCmd(cmd, row) {
  if (cmd === 'history') openHistory(row)
  else if (cmd === 'top') toggleTop(row)
  else if (cmd === 'hide') toggleHide(row)
  else if (cmd === 'move') openMoveDialog(row)
  else if (cmd === 'seo') openSeoDialog(row)
}

async function toRubbish(row) {
  try {
    await ElMessageBox.confirm(t('manage.moveToRubbishConfirm', { title: row.pre_title || row.title }), t('common.tip'), { type: 'warning' })
    await request.post('/api/content/rubbish', { id: row.id })
    ElMessage.success(t('manage.rubbished'))
    loadArticles(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function recycle(row) {
  try {
    await request.post('/api/content/recycle', { id: row.id })
    ElMessage.success(t('admin.restoreDone'))
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('manage.restoreFailed'))
  }
}

async function reallyDelete(row) {
  try {
    await ElMessageBox.confirm(t('manage.deleteForeverConfirm'), t('manage.warning'), { type: 'error' })
    await request.post('/api/content/delete', { id: row.id })
    ElMessage.success(t('admin.deleted'))
    loadArticles(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

/* ---------- 节点操作 ---------- */
const nodeDialogVisible = ref(false)
// 移动文章到节点
const moveDialogVisible = ref(false)
const moveTarget = ref(null)
const moveTargetNodeId = ref(0)
const moving = ref(false)

function openMoveDialog(row) {
  moveTarget.value = row
  moveTargetNodeId.value = 0
  moveDialogVisible.value = true
}

async function confirmMove() {
  if (!moveTargetNodeId.value) {
    ElMessage.warning(t('manage.selectNode'))
    return
  }
  moving.value = true
  try {
    await request.post('/api/content/update/node', {
      id: moveTarget.value.id,
      node_id: moveTargetNodeId.value
    })
    ElMessage.success(t('manage.moved'))
    moveDialogVisible.value = false
    await loadNodes()
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('manage.moveFailed'))
  } finally {
    moving.value = false
  }
}
// 编辑文章 SEO
const seoDialogVisible = ref(false)
const seoTarget = ref(null)
const seoForm = ref('')
const seoSaving = ref(false)

function openSeoDialog(row) {
  seoTarget.value = row
  seoForm.value = row.seo || ''
  seoDialogVisible.value = true
}

async function confirmSeo() {
  const v = seoForm.value.trim()
  if (!v) {
    ElMessage.warning(t('editor.enterSeo'))
    return
  }
  if (!/^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(v)) {
    ElMessage.warning(t('editor.seoInvalid'))
    return
  }
  seoSaving.value = true
  try {
    await request.post('/api/content/update/seo', {
      id: seoTarget.value.id,
      seo: v
    })
    ElMessage.success(t('manage.seoUpdated'))
    seoDialogVisible.value = false
    loadArticles(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('admin.saveFailed'))
  } finally {
    seoSaving.value = false
  }
}
const nodeSaving = ref(false)
const nodeEditId = ref(0)
const nodeParentId = ref(0)
const nodeFormRef = ref(null)
const nodeForm = reactive({ name: '', seo: '', describe: '' })
const nodeRules = {
  name: [{ required: true, message: t('manage.enterNodeName'), trigger: 'blur' }],
  // SEO 选填：留空由后端自动生成；有输入才校验格式
  seo: [
    {
      pattern: /^[A-Za-z0-9\u4e00-\u9fa5]+$/,
      message: t('editor.seoInvalid'),
      trigger: 'blur'
    }
  ]
}

function openNodeDialog(parentId, isChild = false, data = null) {
  if (isChild) {
    nodeEditId.value = 0
    nodeParentId.value = parentId
    nodeForm.name = ''
    // 新建节点：SEO 预填随机短码（可见、可改；留空保存时后端也会兜底生成）
    nodeForm.seo = genSeo()
    nodeForm.describe = ''
  } else if (data) {
    nodeEditId.value = data.id
    nodeParentId.value = data.parent_node_id || 0
    nodeForm.name = data.name
    nodeForm.seo = data.seo
    nodeForm.describe = data.describe
    // /node/take：编辑时拉取节点最新详情（保证表单与库一致）
    request.post('/api/node/take', { id: data.id, seo: '' })
      .then((res) => {
        if (res.data) {
          nodeForm.name = res.data.name ?? nodeForm.name
          nodeForm.seo = res.data.seo ?? nodeForm.seo
          nodeForm.describe = res.data.describe ?? nodeForm.describe
        }
      })
      .catch(() => {})
  } else {
    // 新建一级节点
    nodeEditId.value = 0
    nodeParentId.value = 0
    nodeForm.name = ''
    nodeForm.seo = genSeo()
    nodeForm.describe = ''
  }
  nodeDialogVisible.value = true
}

async function saveNode() {
  nodeFormRef.value.validate(async (valid) => {
    if (!valid) return
    nodeSaving.value = true
    try {
      if (nodeEditId.value) {
        await request.post('/api/node/update/info', {
          id: nodeEditId.value,
          name: nodeForm.name,
          describe: nodeForm.describe
        })
        await request.post('/api/node/update/seo', { id: nodeEditId.value, seo: nodeForm.seo })
      } else {
        await request.post('/api/node/create', {
          seo: nodeForm.seo,
          name: nodeForm.name,
          describe: nodeForm.describe,
          parent_node_id: nodeParentId.value,
          image_path: ''
        })
      }
      ElMessage.success(t('admin.saveSuccess'))
      nodeDialogVisible.value = false
      await loadNodes()
    } catch (e) {
      const map = {
        101000: t('editor.seoUsed'),
        99996: t('manage.vipOnlyNode'),
        100010: t('manage.seoFormatInvalid')
      }
      ElMessage.error(map[e.id] || e.msg || t('admin.saveFailed'))
    } finally {
      nodeSaving.value = false
    }
  })
}

// 隐藏/显示节点：隐藏后该节点及其子节点下的文章不再出现在首页/发现页/他人主页，
// 作者本人仍能看到（带「已隐藏」标记），文章直链仍可打开。
async function toggleNodeStatus(node) {
  const status = node.status === 1 ? 0 : 1
  try {
    await request.post('/api/node/update/status', { id: node.id, status })
    node.status = status
    ElMessage.success(status === 1 ? t('nodes.hiddenDone') : t('nodes.shownDone'))
  } catch (e) {
    ElMessage.error(e.msg || t('admin.saveFailed'))
  }
}

async function deleteNode(data) {
  // 有内容的节点：直接友好提示，不发起请求
  if ((data.content_num || 0) > 0) {
    ElMessage.warning(t('manage.nodeHasArticles', { n: data.content_num }))
    return
  }
  try {
    await ElMessageBox.confirm(t('manage.deleteNodeConfirm', { name: data.name }), t('common.tip'), { type: 'warning' })
    await request.post('/api/node/delete', { id: data.id })
    ElMessage.success(t('common.deleted'))
    if (selectedNodeId.value === data.id) selectedNodeId.value = 0
    await loadNodes()
    loadArticles(1)
  } catch (e) {
    if (e !== 'cancel') {
      // 后端拒绝（如刚发布的内容计数未刷新）
      if (e.id === 101005) {
        ElMessage.warning(t('manage.nodeHasContent'))
      } else {
        ElMessage.error(e.msg || t('common.deleteFailed'))
      }
    }
  }
}

// 节点上下移排序（调 /node/sort：X 拖到 Y 下面）
async function moveNode(node, dir, isParent) {
  try {
    const list = isParent ? nodes.value : (nodes.value.find((n) => n.son?.some((s) => s.id === node.id))?.son || [])
    const idx = list.findIndex((n) => n.id === node.id)
    if (idx === -1) return
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= list.length) return
    // 后端语义「把 x 插到 y 之后」：
    // 上移 = 把上面那个节点(target)插到本节点之后 → 本节点上移一位
    // 下移 = 把本节点插到下面那个节点(target)之后 → 本节点下移一位
    if (dir < 0) {
      await request.post('/api/node/sort', { xid: list[targetIdx].id, yid: node.id })
    } else {
      await request.post('/api/node/sort', { xid: node.id, yid: list[targetIdx].id })
    }
    ElMessage.success(t('manage.sortSaved'))
    await loadNodes()
  } catch (e) {
    ElMessage.error(e.msg || t('admin.sortFailed'))
    await loadNodes()
  }
}

// 文章上下移排序（移动端替代拖拽；语义同节点：把 x 插到 y 之后）
async function moveArticle(row, dir) {
  const list = articles.value
  const idx = list.findIndex((a) => a.id === row.id)
  if (idx === -1) return
  const targetIdx = idx + dir
  if (targetIdx < 0 || targetIdx >= list.length) return
  const target = list[targetIdx]
  const xid = dir < 0 ? target.id : row.id
  const yid = dir < 0 ? row.id : target.id
  await saveSort(xid, yid, '/api/content/sort')
  await loadArticles(page.value)
}

const route = useRoute()
const router = useRouter()

// 从路由解析编辑状态：?write=1 → 新建，?edit=id → 编辑，无 → 列表
function editingIdFromRoute() {
  if (route.query.write) return -1
  if (route.query.edit) return Number(route.query.edit) || 0
  return 0
}

// 打开/关闭编辑器时同步 URL（固定可复制，复制到其他浏览器登录后即可续编）
function syncUrl(editing) {
  if (editing === -1) {
    router.replace({ name: 'user-manage', query: { write: '1' } })
  } else if (editing > 0) {
    router.replace({ name: 'user-manage', query: { edit: String(editing) } })
  } else {
    router.replace({ name: 'user-manage' })
  }
}

// editingId 变化 → 同步 URL
watch(editingId, (val) => {
  const expected = editingIdFromRoute()
  if (val !== expected) syncUrl(val)
})

// 浏览器前进/后退 → 同步回 editingId（返回列表时刷新数据）
watch(
  () => route.fullPath,
  () => {
    const expected = editingIdFromRoute()
    if (editingId.value !== expected) {
      editingId.value = expected
      if (expected === 0) {
        loadArticles(1)
        loadNodes()
      }
    }
  }
)

onMounted(() => {
  loadNodes()
  loadArticles(1)
  // 支持 ?write=1（新建）和 ?edit=id（编辑）直达编辑器
  editingId.value = editingIdFromRoute()
})
</script>

<style scoped>
.manage-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* 左侧节点树 */
.manage-side {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 14px;
  box-shadow: var(--zh-shadow);
  transition: width 0.2s;
}

/* 折叠：只留一条竖条 + 展开按钮，编辑器获得全宽 */
.manage-side.collapsed {
  width: 44px;
  padding: 14px 8px;
}

.manage-side.collapsed .side-title,
.manage-side.collapsed .tree-wrap,
.manage-side.collapsed .el-button:not(.collapse-btn) {
  display: none;
}

.collapse-btn {
  margin-left: auto;
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.side-title {
  font-size: 16px;
  font-weight: 600;
}

.tree-all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--zh-radius);
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 6px;
}

.tree-all .count {
  margin-left: auto;
  background: #f5f0ed;
  color: var(--zh-text-3);
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 999px;
}

.tree-all:hover {
  background: #faf7f5;
}

.tree-all.active {
  background: #fff1f0;
  color: var(--zh-blue);
}

.count {
  color: var(--zh-text-3);
  font-size: 12px;
  margin-left: 6px;
}

.node-list {
  max-height: 560px;
  overflow-y: auto;
}

.node-group {
  margin-bottom: 2px;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--zh-radius);
  cursor: pointer;
  font-size: 14px;
}

.node-row:hover {
  background: #faf7f5;
}

.node-row.active {
  background: #fff1f0;
  color: var(--zh-blue);
  font-weight: 600;
}

.node-row.son {
  padding-left: 28px;
  font-size: 13px;
  color: var(--zh-text-2);
}

.node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-num {
  background: #f5f0ed;
  color: var(--zh-text-3);
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.node-row.active .node-num {
  background: #ffe4e2;
  color: var(--zh-blue);
}

.node-ops {
  display: none;
  gap: 0;
  flex-shrink: 0;
}

.node-ops :deep(.el-button) {
  padding: 2px 3px;
  font-size: 12px;
  margin-left: 0;
}

.node-row:hover .node-ops {
  display: inline-flex;
}

/* 右侧文章管理 */
.manage-main {
  flex: 1;
  min-width: 0;
}

.main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: var(--zh-shadow);
}

.main-title {
  font-size: 17px;
  font-weight: 600;
}

.main-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
}


.sort-hint {
  color: var(--zh-text-3);
  font-size: 12px;
}

.article-list {
  min-height: 60px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: var(--zh-shadow);
}

.article-item.rubbish {
  opacity: 0.7;
}

/* 拖拽把手：默认弱显示，hover 节点/文章行时醒目（父/子节点用不同 class 避免嵌套 draggable 抢占） */
.drag-handle,
.son-drag-handle {
  cursor: grab;
  color: #d9d2cc;
  font-size: 18px;
  padding: 4px 6px;
  user-select: none;
  flex-shrink: 0;
  transition: color 0.2s;
}

.drag-handle:active,
.son-drag-handle:active {
  cursor: grabbing;
}

.node-row:hover .drag-handle,
.node-row:hover .son-drag-handle,
.article-item:hover .drag-handle {
  color: var(--zh-blue);
}

/* 拖拽中的幽灵占位 */
.drag-ghost {
  opacity: 0.5;
  background: #fff3f1 !important;
  border: 1px dashed var(--zh-blue) !important;
  border-radius: 6px;
}

.node-draggable,
.node-son-draggable {
  min-height: 8px;
}

.node-son-draggable {
  margin-left: 28px;
}

.art-body {
  flex: 1;
  min-width: 0;
}

.art-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.art-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--zh-text);
  text-decoration: none;
}

.art-title:hover {
  color: var(--zh-blue);
}

.art-tags {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

.art-meta {
  display: flex;
  gap: 16px;
  margin-top: 5px;
  color: var(--zh-text-3);
  font-size: 12px;
}

/* 首发时间比更新稍醒目 */
.first-pub {
  color: var(--zh-text-2);
}

.art-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.art-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* 文章上下移按钮：仅移动端显示（PC 端仍用拖拽，不影响 PC） */
.art-sort-btn {
  display: none;
}

.move-node-tree {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #f5f0ed;
  border-radius: 6px;
  padding: 8px;
}

.mv-node {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
}

.mv-node:hover {
  background: #fff3f1;
  color: var(--zh-blue);
}

.mv-node.active {
  background: var(--zh-blue);
  color: #fff;
  font-weight: 600;
}

.mv-node.son {
  padding-left: 26px;
  font-size: 13px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
/* ===== 移动端：侧栏堆叠到顶部（900px 以下都堆叠，避免窄桌面挤压） ===== */
@media (max-width: 900px) {
  .manage-page {
    flex-direction: column;
  }

  /* 移动端编辑时隐藏节点树，让编辑器全屏（写完返回列表时再显示） */
  .manage-page.editing .manage-side {
    display: none;
  }

  .manage-side {
    width: 100%;
    max-height: 260px;
    overflow-y: auto;
  }

  .manage-main {
    width: 100%;
  }

  .main-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  /* 修复移动端横向溢出：筛选行换行 + 长提示文本允许换行 */
  .main-filters {
    flex-wrap: wrap;
    width: 100%;
  }

  .sort-hint {
    white-space: normal;
    word-break: break-word;
    max-width: 100%;
    line-height: 1.5;
  }

  .article-item {
    flex-wrap: wrap;
  }

  /* 移动端无 hover：节点操作按钮（↑/↓/＋子/改/删）始终显示 */
  .node-ops {
    display: inline-flex !important;
  }

  /* 移动端显示文章上下移按钮（PC 隐藏） */
  .art-sort-btn {
    display: inline-flex;
  }

  .art-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .art-head {
    flex-wrap: wrap;
  }
}


.node-hidden-tag {
  font-size: 12px;
  color: var(--zh-orange, #e6a23c);
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
  margin-left: 6px;
}

.prop-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 11px;
  line-height: 1;
  cursor: help;
  opacity: 0.6;
  margin-left: 4px;
  vertical-align: 1px;
}
</style>
