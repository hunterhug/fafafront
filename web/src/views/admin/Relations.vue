<template>
  <el-card class="relations-card">
    <template #header>
      <div class="rel-head">
        <span>{{ t('admin.allRelations') }}</span>
        <div class="rel-filters">
          <el-input v-model="filter.userName" size="small" :placeholder="t('admin.filterByUserName')" style="width: 160px" clearable @keyup.enter="load(1)" @clear="load(1)" />
          <el-button size="small" @click="load(1)">{{ t('common.search') }}</el-button>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="relations.length === 0" :description="t('admin.noRelations')" :image-size="60" />
      <el-table v-else :data="relations" size="small">
        <el-table-column :label="t('admin.follower')" min-width="140">
          <template #default="{ row }">
            <div class="rel-user">
              <el-avatar :size="26" :src="thumbUrl(userOf(row.user_a_id)?.head_photo)">
                {{ (userOf(row.user_a_id)?.nick_name || row.user_a_name || '?')[0] }}
              </el-avatar>
              <router-link :to="`/u/${row.user_a_name}`" class="rel-name">
                {{ userOf(row.user_a_id)?.nick_name || row.user_a_name }}
              </router-link>
              <span class="rel-uname">@{{ row.user_a_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.followArrow')" width="60" align="center">
          <template #default><span style="color: #ff5f57">→</span></template>
        </el-table-column>
        <el-table-column :label="t('admin.followed')" min-width="140">
          <template #default="{ row }">
            <div class="rel-user">
              <el-avatar :size="26" :src="thumbUrl(userOf(row.user_b_id)?.head_photo)">
                {{ (userOf(row.user_b_id)?.nick_name || row.user_b_name || '?')[0] }}
              </el-avatar>
              <router-link :to="`/u/${row.user_b_name}`" class="rel-name">
                {{ userOf(row.user_b_id)?.nick_name || row.user_b_name }}
              </router-link>
              <span class="rel-uname">@{{ row.user_b_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.relation')" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_both" type="success" size="small">{{ t('admin.mutual') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('admin.oneWay') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.followTime')" width="170">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="totalPages > 1"
        class="pager"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="limit"
        :current-page="page"
        @current-change="load"
      />
    </template>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const relations = ref([])
const users = ref({})
const page = ref(1)
const limit = 20
const total = ref(0)
const totalPages = ref(0)
const filter = reactive({ userName: '' })

function userOf(id) {
  return users.value[id] || null
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/relation/admin/list', {
      user_a_id: 0,
      user_b_id: 0,
      user_a_name: filter.userName || '',
      user_b_name: '',
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '=user_a_id', '=user_b_id', '-create_time'],
      limit,
      page: p
    })
    relations.value = res.data.relations || []
    users.value = res.data.users || {}
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    relations.value = []
  } finally {
    loading.value = false
  }
}

function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

onMounted(() => load(1))
</script>

<style scoped>
.rel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rel-filters {
  display: flex;
  gap: 8px;
}

.rel-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rel-name {
  color: var(--zh-text);
  font-weight: 600;
  text-decoration: none;
  font-size: 13px;
}

.rel-name:hover {
  color: var(--zh-blue);
}

.rel-uname {
  color: var(--zh-text-3);
  font-size: 11px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
</style>
