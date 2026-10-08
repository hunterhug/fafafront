<template>
  <el-card class="nodes-card">
    <template #header>
      <div class="nd-head">
        <span>{{ t('admin.nodesAllUsers') }}</span>
        <span class="nd-total">{{ t('admin.totalNodesCount', { n: flatNodes.length }) }}</span>
      </div>
    </template>

    <el-form inline size="small" class="filter-form">
      <el-form-item :label="t('admin.author')">
        <el-input v-model="filter.user_name" :placeholder="t('admin.authorUserName')" clearable @keyup.enter="load" @clear="load" />
      </el-form-item>
      <el-form-item :label="t('admin.status')">
        <el-select v-model="filter.status" style="width: 110px" @change="load">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.normal')" :value="0" />
          <el-option :label="t('admin.hidden')" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">{{ t('common.search') }}</el-button>
      </el-form-item>
    </el-form>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="flatNodes.length === 0" :description="t('admin.noNodes')" :image-size="60" />
      <el-table v-else :data="flatNodes" size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column :label="t('admin.nodeName')" min-width="130" fixed="left">
          <template #default="{ row }">
            <span :class="{ 'nd-son': row.level === 1 }">
              {{ row.level === 1 ? '　└ ' : '' }}{{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="describe" :label="t('admin.description')" min-width="140" show-overflow-tooltip />
        <el-table-column prop="seo" label="SEO" min-width="90" />
        <el-table-column :label="t('admin.author')" width="110">
          <template #default="{ row }">
            <router-link :to="`/u/${row.user_name}`" class="nd-link">{{ row.user_name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.level')" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="row.level === 0 ? 'primary' : 'info'">{{ row.level === 0 ? t('admin.levelOne') : t('admin.levelTwo') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.parentNode')" width="110">
          <template #default="{ row }">
            <span v-if="row.level === 0">—</span>
            <span v-else>{{ parentName(row.parent_node_id) || '#' + row.parent_node_id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort_num" :label="t('admin.sort')" width="70" align="center" />
        <el-table-column prop="content_num" :label="t('admin.contentCount')" width="80" align="center" />
        <el-table-column :label="t('admin.createdTime')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.updatedTime')" width="150">
          <template #default="{ row }">{{ formatTime(row.update_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="warning" size="small">{{ t('admin.hidden') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('admin.normal') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              text
              type="warning"
              :title="t('nodes.hiddenTip')"
              @click="toggleStatus(row)"
            >{{ row.status === 1 ? t('admin.show') : t('admin.hidden') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const nodes = ref([])
const filter = reactive({ user_name: '', status: -1 })

// 扁平化（一级 + 二级），并建立 id → name 映射
const flatNodes = computed(() => {
  const flat = []
  const walk = (list) => {
    for (const n of list) {
      flat.push(n)
      if (n.son && n.son.length) walk(n.son)
    }
  }
  walk(nodes.value)
  return flat
})

const nameMap = computed(() => {
  const m = {}
  for (const n of flatNodes.value) m[n.id] = n.name
  return m
})

function parentName(pid) {
  return nameMap.value[pid] || ''
}

// 管理员隐藏/显示任意用户的节点：隐藏后该节点及其子节点下的文章
// 不再出现在公开列表（首页/发现页/他人主页），只有作者本人仍能看到。
async function toggleStatus(row) {
  const status = row.status === 1 ? 0 : 1
  try {
    await request.post('/api/node/admin/update/status', { id: row.id, status })
    row.status = status
    ElMessage.success(t('admin.nodeStatusUpdated'))
  } catch (e) {
    ElMessage.error(e.msg || t('admin.saveFailed'))
  }
}

async function load() {
  loading.value = true
  try {
    const res = await request.post('/api/node/admin/list', {
      user_id: 0,
      user_name: filter.user_name,
      sort: ['=id', '+sort_num', '-create_time', '-update_time', '+status', '=seo']
    })
    let list = res.data.nodes || []
    // 状态过滤（后端 admin list 未做状态过滤，前端过滤）
    if (filter.status !== -1) {
      list = list
        .map((n) => ({ ...n, son: (n.son || []).filter((s) => s.status === filter.status) }))
        .filter((n) => n.status === filter.status || (n.son && n.son.length > 0))
    }
    nodes.value = list
  } catch (e) {
    nodes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}

.nd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nd-total {
  font-size: 13px;
  color: var(--zh-text-3);
  font-weight: 400;
}

.nd-link {
  color: var(--zh-blue);
  text-decoration: none;
}

.nd-link:hover {
  text-decoration: underline;
}

.nd-son {
  color: var(--zh-text-2);
}
</style>
