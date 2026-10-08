# 推荐规则

前端内容流（首页「推荐」、发现「热门」）与「最新」的排序规则，通过对后端 `/u/content` 的 `sort` 参数实现。

## sort 参数语义

`sort` 是字符串数组，每个元素以前缀表示方向：

- `=字段`：不按该字段排序（显式声明，用于阻止后端白名单兜底）。
- `-字段`：降序。
- `+字段`：升序。

> 后端会校验 sort 字段白名单，`=` 前缀表示「跳过该字段排序」，多列按数组顺序依次生效。

## 首页（Home.vue）

### 推荐

热度主导，评论数优先：

```
=id, =top, =sort_num, -comment_num, -views, -cool, -first_publish_time, -publish_time, =bad, =seo
```

即：评论数 ↓ → 浏览量 ↓ → 点赞数 ↓ → 首次发布时间 ↓。

> `=top`、`=sort_num` 显式声明不参与排序——置顶/手动排序是作者自己可控的字段，全局推荐不应被其左右。

### 最新

```
=id, =top, -first_publish_time, -publish_time, -create_time, -update_time, -views, =comment_num, =bad, =cool, =seo
```

即：首次发布时间 ↓（其余为兜底）。

## 发现（Explore.vue）

### 热门

```
=id, -cool, -views, -comment_num, -first_publish_time, -publish_time, =bad, =seo
```

即：点赞数 ↓ → 浏览量 ↓ → 评论数 ↓ → 首次发布时间 ↓。

### 最新

```
=id, -first_publish_time, -publish_time, -create_time, -update_time, -views, =comment_num, =bad, =cool, =seo
```

与首页「最新」一致。

## 个人主页（/u/xxx）

「推荐」与「最新」复用首页/发现规则；节点 tab 内按「置顶优先 + 手动排序号」：

```
=id, -top, +sort_num, ...
```

即置顶（`top=1`）在前，其余按作者拖拽的 `sort_num` 升序。

## 评论排序（文章详情页评论区）

评论区顶部「最新 / 热门」切换，通过对 `/content/comment` 的 `sort` 参数实现（后端白名单 `CommentSortName`）。

- **最新**：`-create_time` —— 按评论创建时间倒序（新评论在前）。
- **热门**：`-cool` —— 按评论点赞数倒序（点赞多的在前）。

> 点赞数 `cool` 即「热门评论」的唯一依据；当前无时间加权或置顶评论逻辑。楼层号（第 N 楼）始终按时间正序固定编号，与所选排序无关。
