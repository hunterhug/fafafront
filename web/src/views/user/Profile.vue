<template>
  <el-card class="profile-card">
    <template #header>{{ t('user.profileHeader') }}</template>
    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
        <el-form-item :label="t('user.username')">
          <el-input :model-value="user?.name" disabled />
        </el-form-item>
        <el-form-item :label="t('auth.nickname')" prop="nick_name">
          <el-input v-model="form.nick_name" :placeholder="t('user.profileDesc')" />
        </el-form-item>
        <el-form-item :label="t('user.headPhoto')">
          <div class="avatar-row">
            <el-avatar :size="56" :src="form.image_path || undefined">
              {{ (form.nick_name || '?')[0] }}
            </el-avatar>
            <el-upload
              :show-file-list="false"
              :http-request="onSelectAvatar"
              accept="image/*"
            >
              <el-button type="primary" plain size="small">{{ t('user.avatarUpload') }}</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item :label="t('user.shortBio')">
          <el-input v-model="form.short_describe" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item :label="t('user.bio')">
          <el-input v-model="form.describe" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item :label="t('user.gender')">
          <el-radio-group v-model="form.gender">
            <el-radio :value="1">{{ t('user.male') }}</el-radio>
            <el-radio :value="2">{{ t('user.female') }}</el-radio>
            <el-radio :value="0">{{ t('user.secret') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="QQ">
          <el-input v-model="form.qq" />
        </el-form-item>
        <el-form-item :label="t('user.wechat')">
          <el-input v-model="form.wechat" />
        </el-form-item>
        <el-form-item :label="t('user.weibo')">
          <el-input v-model="form.weibo" :placeholder="t('user.weiboPlaceholder')">
            <template #prepend>https://weibo.com/</template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('user.github')">
          <el-input v-model="form.github" :placeholder="t('user.githubPlaceholder')">
            <template #prepend>https://github.com/</template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="submit">{{ t('common.save') }}</el-button>
        </el-form-item>
      </el-form>
    </template>

    <!-- 头像裁剪对话框 -->
    <el-dialog v-model="cropVisible" :title="t('user.cropAvatar')" width="420px" :close-on-click-modal="false" append-to-body>
      <div class="crop-wrap">
        <img ref="cropImgRef" :src="cropSrc" :alt="t('user.cropImage')" />
      </div>
      <template #footer>
        <el-button @click="cropVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="cropping" @click="confirmCrop">{{ t('user.confirmCrop') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import request from '@/api'
import { t } from '@/i18n'
import { normSocial } from '@/utils/format'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(true)
const saving = ref(false)
const user = ref(null)

const form = reactive({
  nick_name: '',
  short_describe: '',
  describe: '',
  gender: 0,
  qq: '',
  wechat: '',
  weibo: '',
  github: '',
  image_path: ''
})

const rules = {
  nick_name: [{ required: true, message: t('auth.enterNickname'), trigger: 'blur' }]
}

async function load() {
  try {
    const res = await request.get('/api/user/info')
    user.value = res.data
    form.nick_name = res.data.nick_name || ''
    form.short_describe = res.data.short_describe || ''
    form.describe = res.data.describe || ''
    form.gender = res.data.gender || 0
    form.qq = res.data.qq || ''
    form.wechat = res.data.wechat || ''
    // 只存账号后缀（前缀固定显示，不入库）
    form.weibo = normSocial(res.data.weibo, 'weibo.com')
    form.github = normSocial(res.data.github, 'github.com')
    form.image_path = res.data.head_photo || ''
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    loading.value = false
  }
}

// ============ 头像裁剪上传 ============
const cropVisible = ref(false)
const cropSrc = ref('')
const cropImgRef = ref(null)
const cropping = ref(false)
let cropper = null

// 选择头像后先进入裁剪，不上传原图
async function onSelectAvatar({ file }) {
  const reader = new FileReader()
  reader.onload = (e) => {
    cropSrc.value = e.target.result
    cropVisible.value = true
    nextTick(() => {
      if (cropper) {
        cropper.destroy()
        cropper = null
      }
      cropper = new Cropper(cropImgRef.value, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        background: false
      })
    })
  }
  reader.readAsDataURL(file)
  // el-upload 的 http-request 需要一个 Promise 表示结束
  return Promise.resolve()
}

// {{ t('user.confirmCrop') }}：输出方形 JPEG 后上传
async function confirmCrop() {
  if (!cropper) return
  cropping.value = true
  try {
    const canvas = cropper.getCroppedCanvas({ width: 320, height: 320 })
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      ElMessage.error(t('common.failed'))
      return
    }
    const fd = new FormData()
    fd.append('type', 'image')
    fd.append('describe', 'head photo')
    fd.append('tag', 'head')
    fd.append('file', blob, 'avatar.jpg')
    const res = await request.post('/api/file/upload', fd)
    const path = res.data?.url || res.data?.path || res.data?.file_path || ''
    if (path) {
      form.image_path = path
      // 立即同步到导航/个人中心头像
      userStore.setUser({ ...userStore.user, head_photo: path })
      ElMessage.success(t('user.profileSaved'))
      cropVisible.value = false
    } else {
      ElMessage.warning('上传失败')
    }
  } catch (e) {
    ElMessage.error(e.msg || '上传失败')
  } finally {
    cropping.value = false
  }
}

function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await request.post('/api/user/update', {
        nick_name: form.nick_name,
        short_describe: form.short_describe,
        describe: form.describe,
        gender: form.gender,
        qq: form.qq,
        wechat: form.wechat,
        weibo: form.weibo,
        github: form.github,
        image_path: form.image_path
      })
      ElMessage.success(t('user.profileSaved'))
      // 刷新 store 中的用户信息（含头像）
      if (userStore.user) {
        userStore.setUser({
          ...userStore.user,
          nick_name: form.nick_name,
          head_photo: form.image_path || userStore.user.head_photo
        })
      }
    } catch (e) {
      
      ElMessage.error(e.msg || t('common.failed'))
    } finally {
      saving.value = false
    }
  })
}

onMounted(load)
</script>

<style scoped>
.profile-card {
  max-width: 640px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.crop-wrap {
  max-height: 56vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f1f1f;
  border-radius: 8px;
}

.crop-wrap img {
  display: block;
  max-width: 100%;
  max-height: 56vh;
}
</style>
