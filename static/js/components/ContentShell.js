/**
 * ContentShell.js
 * Shared Vuetify-first layout shell for page-level content.
 *
 * Every route renders the same 2 / 8 / 2 skeleton: a fixed-width reading column
 * (a centred wrapper div) flanked by two side rails. The rails are present on `lg`
 * and up and hidden below; the centre column's width and position never change,
 * so the reading column stays visually invariant across routes (a list page and
 * an article share the exact same geometry). A rail whose slot is empty renders
 * as whitespace in the reserved gutter.
 *
 * The single <main> landmark is Vuetify's <v-main> (App.js); this shell stays
 * inside it and uses plain divs, so there is never more than one <main>.
 */
const { computed } = Vue;

export default {
  name: 'ContentShell',
  props: {
    containerClass: {
      type: String,
      default: 'py-12'
    }
  },
  template: `
    <v-container fluid :class="containerClass" :style="containerStyle">
      <!-- Optional header row: only for views that fill the #header slot
           (PostView/AboutView). Shares the same 2/8/2 geometry so the title
           aligns with the article body, while the rails below start at the
           content top rather than the title. -->
      <v-row v-if="hasHeader" justify="center" align="start">
        <v-col
          cols="12"
          lg="2"
          class="d-none d-lg-block"
          aria-hidden="true"
        ></v-col>

        <v-col cols="12" lg="8" :style="mainColStyle">
          <div class="mx-auto" :style="articleStyle">
            <slot name="header"></slot>
          </div>
        </v-col>

        <v-col
          cols="12"
          lg="2"
          class="d-none d-lg-block"
          aria-hidden="true"
        ></v-col>
      </v-row>

      <v-row justify="center" align="start">
        <v-col
          cols="12"
          lg="2"
          class="d-none d-lg-block"
          :style="railColStyle"
        >
          <div :style="railStyle">
            <slot name="aside-left"></slot>
          </div>
        </v-col>

        <v-col cols="12" lg="8" :style="mainColStyle">
          <div class="mx-auto" :style="articleStyle">
            <slot></slot>
          </div>
        </v-col>

        <v-col
          cols="12"
          lg="2"
          class="d-none d-lg-block"
          :style="railColStyle"
        >
          <div :style="railStyle">
            <slot name="aside"></slot>
          </div>
        </v-col>
      </v-row>
    </v-container>
  `,
  setup(props, { slots }) {
    const hasHeader = computed(() => Boolean(slots.header));

    // Container is always the rail-aware width and centred, so the reserved rail
    // gutters (and therefore the centre column) stay put whether rails are
    // filled or empty.
    // Geometry constants live in CSS (:root layout tokens in slotify.css) so the
    // shell, the reading width, and the rail offset share one source of truth.
    const containerStyle = {
      width: 'min(100%, var(--shell-max-width))',
      maxWidth: 'var(--shell-max-width)'
    };

    const mainColStyle = {
      maxWidth: 'var(--content-col-max)'
    };

    // Reading column width — shared by both the header row and the content row
    // so they can never drift apart.
    const articleStyle = {
      maxWidth: 'var(--content-max-width)',
      minWidth: 0
    };

    const railColStyle = {
      position: 'sticky',
      top: 'var(--rail-sticky-top)',
      alignSelf: 'start',
      maxHeight: 'var(--rail-max-height)'
    };

    const railStyle = {
      maxHeight: 'inherit',
      minWidth: 0
    };

    return {
      articleStyle,
      containerStyle,
      hasHeader,
      mainColStyle,
      railColStyle,
      railStyle
    };
  }
};
