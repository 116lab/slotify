/**
 * SeriesNavigator.js
 * Presentational left-rail sibling-post navigator for a post's series. Shares
 * the Table of Contents' primary accent; distinguished from it by content shape
 * (a numbered list), not color. Renders only when the post belongs to a series
 * with >1 post.
 *
 * Labels (title / expand / collapse) are passed in as props, so the component
 * is i18n-agnostic: its strings live in the slot namespace that mounts it
 * (Slotify.slots.postView.left), keeping that slot self-contained.
 */
import SidebarPanel from './SidebarPanel.js';

export default {
  name: 'SeriesNavigator',
  components: {
    SidebarPanel
  },
  props: {
    // { name: String, url: String, posts: [{ title, url, current }] }
    nav: { type: Object, default: () => ({}) },
    title: { type: String, default: '' },
    expandLabel: { type: String, default: '' },
    collapseLabel: { type: String, default: '' }
  },
  template: `
    <sidebar-panel
      v-if="nav && nav.posts && nav.posts.length > 1"
      icon="mdi-bookshelf"
      :title="title"
      accent="primary"
      :expand-label="expandLabel"
      :collapse-label="collapseLabel"
    >
      <router-link v-if="nav.url" :to="nav.url" class="series-nav-title">
        {{ nav.name }}
      </router-link>

      <ol class="series-nav-list sidebar-panel-list">
        <li
          v-for="post in nav.posts"
          :key="post.url"
          class="series-nav-item"
          :class="{ 'series-nav-item--current': post.current }"
        >
          <span v-if="post.current" class="series-nav-link sidebar-panel-link series-nav-link--current" aria-current="page">
            {{ post.title }}
          </span>
          <router-link v-else :to="post.url" class="series-nav-link sidebar-panel-link">
            {{ post.title }}
          </router-link>
        </li>
      </ol>
    </sidebar-panel>
  `
};
