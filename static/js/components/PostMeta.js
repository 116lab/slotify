import { t } from '../i18n.js';
import { hasDisplayDate, hasTaxonomy, hasSeries, hasTags } from '../utils/contentFields.js';
import BaseChip from './BaseChip.js';

export default {
  name: 'PostMeta',
  components: {
    BaseChip
  },
  props: {
    pageData: { type: Object, required: true }
  },
  template: `
    <div class="px-0 pb-2 pt-0 d-flex flex-column">
      <!-- Row 1: Article metadata (Date, Author, Reading Time, Words) -->
      <v-card-subtitle class="pa-0 d-flex align-center flex-wrap">
        <span v-if="hasDisplayDate(pageData)" class="text-caption font-weight-bold d-inline-flex align-center cursor-default mr-4 my-1">
          <v-icon start icon="mdi-calendar-blank" size="small" color="primary"></v-icon>
          {{ pageData.date }}
        </span>
        <span v-if="pageData.author" class="text-caption font-weight-bold d-inline-flex align-center cursor-default mr-4 my-1">
          <v-icon start icon="mdi-account-edit-outline" size="small" color="primary"></v-icon>
          {{ t('ui.author') }}: {{ pageData.author }}
        </span>
        <span v-if="pageData.readingTime" class="text-caption font-weight-bold d-inline-flex align-center cursor-default mr-4 my-1">
          <v-icon start icon="mdi-clock-outline" size="small" color="primary"></v-icon>
          {{ t('ui.readingTime', { min: pageData.readingTime }) }}
        </span>
        <span v-if="pageData.wordCount" class="text-caption font-weight-bold d-inline-flex align-center cursor-default mr-4 my-1">
          <v-icon start icon="mdi-file-word-outline" size="small" color="primary"></v-icon>
          {{ t('ui.words', { count: pageData.wordCount }) }}
        </span>
      </v-card-subtitle>

      <!-- Row 2: Taxonomy chips (Series, Tags) -->
      <div
        v-if="hasTaxonomy(pageData)"
        class="d-flex align-center flex-wrap mt-3"
      >
        <template v-if="hasSeries(pageData)">
          <base-chip
            v-for="serie in pageData.series"
            :key="serie"
            type="series"
            :title="serie"
            class="mr-2 my-1"
          ></base-chip>
        </template>
        <template v-if="hasTags(pageData)">
          <base-chip
            v-for="tag in pageData.tags"
            :key="tag"
            type="tag"
            :title="tag"
            size="small"
            class="mr-2 my-1"
          ></base-chip>
        </template>
      </div>
    </div>
  `,
  setup() {
    return { t, hasDisplayDate, hasTaxonomy, hasSeries, hasTags };
  }
};
