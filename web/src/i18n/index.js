import { ref } from 'vue'
import zh from './locales/zh'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import de from './locales/de'
import fr from './locales/fr'
import es from './locales/es'
import pt from './locales/pt'
import it from './locales/it'
import ru from './locales/ru'

// 语言列表（原生名，参考苹果地区/语言选择器）
export const LANGUAGES = [
  { code: 'zh', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'ru', name: 'Русский' }
]

const messages = { zh, en, ja, ko, de, fr, es, pt, it, ru }

const STORAGE_KEY = 'fafa_locale'

// 默认中文；用户选择后持久化到 localStorage
const locale = ref(localStorage.getItem(STORAGE_KEY) || 'zh')
document.documentElement.lang = locale.value

// 翻译函数：支持 {name} 插值，未命中回退中文，再回退 key
export function t(key, params) {
  const dict = messages[locale.value] || zh
  let str = dict[key] ?? zh[key] ?? key
  if (params) {
    for (const k of Object.keys(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]))
    }
  }
  return str
}

export function setLocale(code) {
  if (!messages[code]) return
  locale.value = code
  localStorage.setItem(STORAGE_KEY, code)
  document.documentElement.lang = code
}

export function currentLocale() {
  return locale.value
}

export { locale }

export default { locale, t, setLocale, currentLocale, LANGUAGES }
