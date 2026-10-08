<template>
  <div class="not-found">
    <el-result icon="warning" title="404" :sub-title="t('error.notFound')">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">{{ t('error.backHome') }}</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
</script>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
</style>
