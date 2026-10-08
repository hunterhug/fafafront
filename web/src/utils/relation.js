import request from '@/api'

let myFansCache = null // 会话内缓存（null=未加载）

// 拉取"我的粉丝"id 集合（followed/me 分页上限 100，循环拉全）
// 返回 Set<number>；未登录返回空 Set
export async function fetchMyFans(force = false) {
  if (myFansCache && !force) return myFansCache
  const fans = new Set()
  let page = 1
  const limit = 100
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let res
    try {
      res = await request.post('/api/relation/followed/me', {
        limit,
        page,
        sort: ['=id', '=user_a_id', '=user_b_id', '-create_time']
      })
    } catch (e) {
      break // 未登录或出错：返回已收集的
    }
    const rels = res.data?.relations || []
    rels.forEach((r) => fans.add(r.user_a_id))
    const total = res.data?.total || 0
    if (page * limit >= total || rels.length === 0) break
    page += 1
  }
  myFansCache = fans
  return fans
}
