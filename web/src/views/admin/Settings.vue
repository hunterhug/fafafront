<template>
  <el-card class="settings-card">
    <template #header>{{ t('admin.settings') }}</template>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      :title="t('admin.settingsHint')"
      style="margin-bottom: 16px"
    />
    <el-form label-width="100px" style="max-width: 640px">
      <el-form-item :label="t('admin.siteTitle')">
        <el-input v-model="form.site_title" :placeholder="t('admin.siteTitlePlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('admin.siteSubtitle')">
        <el-input v-model="form.site_subtitle" :placeholder="t('admin.siteSubtitlePlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('admin.siteIntro')">
        <el-input
          v-model="form.site_intro"
          type="textarea"
          :rows="2"
          :placeholder="t('admin.siteIntroPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('admin.footerIntro')">
        <el-input
          v-model="form.footer_intro"
          type="textarea"
          :rows="3"
          :placeholder="t('admin.footerIntroPlaceholder')"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">{{ t('common.save') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { useSiteStore } from '@/store/site'
import { t } from '@/i18n'

const site = useSiteStore()
const saving = ref(false)
const form = reactive({ site_title: '', site_subtitle: '', site_intro: '', footer_intro: '' })

async function load() {
  try {
    const res = await request.post('/app/site/config')
    form.site_title = res.data?.site_title || ''
    form.site_subtitle = res.data?.site_subtitle || ''
    form.site_intro = res.data?.site_intro || ''
    form.footer_intro = res.data?.footer_intro || ''
  } catch (e) {
    // 静默
  }
}

async function save() {
  if (!form.site_title.trim()) {
    ElMessage.warning(t('admin.siteTitleRequired'))
    return
  }
  saving.value = true
  try {
    await request.post('/api/site/config/update', {
      site_title: form.site_title.trim(),
      site_subtitle: form.site_subtitle.trim(),
      site_intro: form.site_intro.trim(),
      footer_intro: form.footer_intro.trim()
    })
    ElMessage.success(t('common.saved'))
    await site.load(true)
  } catch (e) {
    ElMessage.error(e.msg || t('admin.saveFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
