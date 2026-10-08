<template>
  <el-card class="users-card">
    <template #header>
      <div class="usr-head">
        <span>{{ t('admin.users') }}</span>
        <span class="usr-total">{{ t('admin.totalPeople', { n: total }) }}</span>
        <el-button size="small" type="primary" @click="createDialog = true">{{ t('admin.createUser') }}</el-button>
      </div>
    </template>

    <!-- 筛选 -->
    <el-form inline size="small" class="filter-form">
      <el-form-item :label="t('user.username')">
        <el-input v-model="filter.name" :placeholder="t('admin.fuzzySearch')" clearable @keyup.enter="load(1)" />
      </el-form-item>
      <el-form-item :label="t('auth.nickname')">
        <el-input v-model="filter.nick_name" :placeholder="t('admin.fuzzySearch')" clearable @keyup.enter="load(1)" />
      </el-form-item>
      <el-form-item :label="t('admin.status')">
        <el-select v-model="filter.status" style="width: 110px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.normal')" :value="1" />
          <el-option :label="t('admin.blacklist')" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="VIP">
        <el-select v-model="filter.vip" style="width: 110px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option label="VIP" :value="1" />
          <el-option :label="t('admin.ordinary')" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load(1)">{{ t('common.query') }}</el-button>
      </el-form-item>
    </el-form>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-table :data="users" size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" :label="t('user.username')" width="110" />
        <el-table-column :label="t('auth.nickname')" width="110">
          <template #default="{ row }">{{ row.nick_name }}</template>
        </el-table-column>
        <el-table-column prop="email" :label="t('auth.email')" min-width="160" />
        <el-table-column :label="t('admin.status')" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 2" type="danger" size="small">{{ t('admin.blacklist') }}</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" size="small">{{ t('admin.normal') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('admin.notActivated') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="VIP" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.vip === 1" type="success" size="small">VIP</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('user.content')" width="70" prop="content_num" />
        <el-table-column :label="t('user.followers')" width="70" prop="followed_num" />
        <el-table-column :label="t('userpage.likes')" width="70" prop="content_cool_num" />
        <el-table-column label="2FA" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.two_fa" type="success" size="small">{{ t('admin.enabled') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('admin.disabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.regTime')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="340" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 2" size="small" type="success" plain @click="setStatus(row, 1)">
              {{ t('admin.unblacklist') }}
            </el-button>
            <el-button v-else-if="row.status === 1" size="small" type="warning" plain @click="setStatus(row, 2)">
              {{ t('admin.blacklist') }}
            </el-button>
            <el-button v-else size="small" type="success" @click="setStatus(row, 1)">{{ t('admin.activateUser') }}</el-button>
            <el-button
              v-if="row.vip === 1"
              size="small"
              type="warning"
              plain
              @click="setVip(row, 2)"
            >{{ t('admin.cancelVip') }}</el-button>
            <el-button v-else size="small" type="success" plain @click="setVip(row, 1)">{{ t('admin.setVip') }}</el-button>
            <el-button size="small" @click="resetPwd(row)">{{ t('admin.changePwd') }}</el-button>
            <el-button size="small" @click="assignGroup(row)">{{ t('admin.assignGroup') }}</el-button>
            <el-button v-if="row.two_fa" size="small" type="warning" plain @click="resetTwoFa(row)">{{ t('admin.reset2fa') }}</el-button>
          </template>
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

    <!-- 创建用户 -->
    <el-dialog v-model="createDialog" :title="t('admin.createUser')" width="480px">
      <el-form ref="createForm" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item :label="t('user.username')" prop="name">
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item :label="t('auth.nickname')" prop="nick_name">
          <el-input v-model="createForm.nick_name" />
        </el-form-item>
        <el-form-item :label="t('auth.email')" prop="email">
          <el-input v-model="createForm.email" />
        </el-form-item>
        <el-form-item :label="t('auth.password')" prop="password">
          <el-input v-model="createForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item :label="t('auth.confirmPassword')" prop="repassword">
          <el-input v-model="createForm.repassword" type="password" show-password />
        </el-form-item>
        <el-form-item :label="t('user.gender')">
          <el-radio-group v-model="createForm.gender">
            <el-radio :value="1">{{ t('user.male') }}</el-radio>
            <el-radio :value="2">{{ t('user.female') }}</el-radio>
            <el-radio :value="0">{{ t('user.secret') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="createUser">{{ t('admin.create') }}</el-button>
      </template>
    </el-dialog>

    <!-- 分配组 -->
    <el-dialog v-model="groupDialog" :title="t('admin.assignGroup')" width="440px">
      <p style="margin-bottom: 12px">{{ t('admin.userLabel') }}<b>{{ groupTarget?.name }}</b></p>
      <el-form label-width="90px">
        <el-form-item :label="t('admin.groups')">
          <el-select v-model="groupSelect" :placeholder="t('admin.selectGroup')" style="width: 100%">
            <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="doAssignGroup">{{ t('admin.assign') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const users = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)

const filter = reactive({ name: '', nick_name: '', status: -1, vip: -1 })

const createDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  name: '',
  nick_name: '',
  email: '',
  password: '',
  repassword: '',
  gender: 0
})
const createRules = {
  name: [{ required: true, message: t('auth.enterUsername'), trigger: 'blur' }],
  nick_name: [{ required: true, message: t('auth.enterNickname'), trigger: 'blur' }],
  email: [
    { required: true, message: t('auth.enterEmail'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' }
  ],
  password: [{ required: true, message: t('auth.enterPassword'), trigger: 'blur' }],
  repassword: [
    { required: true, message: t('auth.enterRepassword'), trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== createForm.password) callback(new Error(t('auth.passwordMismatch')))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

const groupDialog = ref(false)
const groupTarget = ref(null)
const groupSelect = ref(null)
const groups = ref([])

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/user/list', {
      id: 0,
      name: filter.name,
      nick_name: filter.nick_name,
      status: filter.status,
      vip: filter.vip,
      email: '',
      gender: -1,
      create_time_begin: 0,
      create_time_end: 0,
      update_time_begin: 0,
      update_time_end: 0,
      sort: [
        '=id', '=name', '-vip', '-activate_time', '=followed_num',
        '=following_num', '=content_num', '=content_cool_num', '=create_time',
        '=update_time', '=gender'
      ],
      limit,
      page: p
    })
    users.value = res.data.users || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    users.value = []
  } finally {
    loading.value = false
  }
}

async function setStatus(row, status) {
  try {
    await request.post('/api/user/admin/update', { id: row.id, status })
    ElMessage.success(status === 2 ? t('admin.blocked') : t('admin.statusUpdated'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function setVip(row, vip) {
  try {
    await request.post('/api/user/admin/update', { id: row.id, vip })
    ElMessage.success(vip === 1 ? t('admin.vipSet') : t('admin.vipCanceled'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function resetPwd(row) {
  try {
    const { value } = await ElMessageBox.prompt(t('admin.setPwdPrompt', { name: row.name }), t('admin.resetPwdTitle'))
    await request.post('/api/user/admin/update', { id: row.id, password: value })
    ElMessage.success(t('admin.pwdReset'))
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

function createUser() {
  createFormRef.value.validate(async (valid) => {
    if (!valid) return
    creating.value = true
    try {
      await request.post('/api/user/create', {
        name: createForm.name,
        nick_name: createForm.nick_name,
        email: createForm.email,
        password: createForm.password,
        repassword: createForm.repassword,
        gender: createForm.gender,
        wechat: '',
        weibo: '',
        github: '',
        qq: '',
        short_describe: '',
        describe: '',
        image_path: ''
      })
      ElMessage.success(t('admin.userCreated'))
      createDialog.value = false
      load(1)
    } catch (e) {
      ElMessage.error(e.msg || t('admin.createFailed'))
    } finally {
      creating.value = false
    }
  })
}

async function assignGroup(row) {
  groupTarget.value = row
  groupSelect.value = null
  try {
    const res = await request.post('/api/group/list', {
      id: 0, name: '', limit: 100, page: 1,
      sort: ['=id', '=name', '-create_time', '=update_time']
    })
    groups.value = res.data.groups || []
    groupDialog.value = true
  } catch (e) {
    ElMessage.error(e.msg || t('admin.loadGroupsFailed'))
  }
}

async function doAssignGroup() {
  if (!groupSelect.value) {
    ElMessage.warning(t('admin.selectGroupRequired'))
    return
  }
  try {
    await request.post('/api/user/assign', {
      group_id: groupSelect.value,
      group_release: 0,
      users: [groupTarget.value.id]
    })
    ElMessage.success(t('admin.assignSuccess'))
    groupDialog.value = false
  } catch (e) {
    ElMessage.error(e.msg || t('admin.assignFailed'))
  }
}

async function resetTwoFa(row) {
  try {
    await ElMessageBox.confirm(t('admin.reset2faConfirm', { name: row.name }), t('common.tip'), { type: 'warning' })
    await request.post('/api/user/admin/2fa/reset', { id: row.id })
    ElMessage.success(t('admin.2faReset'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}

.usr-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usr-total {
  font-size: 13px;
  color: var(--zh-text-3);
  font-weight: 400;
  flex: 1;
}
</style>
