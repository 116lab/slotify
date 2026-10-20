/**
 * AppHeader.js
 * Navigation bar component for the application.
 */
import { t, localeLabel, LOCALES } from '../i18n.js';
import { navigationItems, paths } from '../config/routes.js';
import { fetchSearchIndex } from '../services/api.js';
import PersonalityList from './PersonalityList.js';

const { useRouter } = VueRouter;

export default {
  components: { PersonalityList },
  props: {
    siteConfig: { type: Object, required: true },
    currentPersonality: { type: String, required: true },
    isDark: { type: Boolean, required: true },
    personalities: { type: Array, required: true },
    currentLocale: { type: String, required: true }
  },
  emits: ['update:currentPersonality', 'update:isDark', 'set-locale', 'toggle-drawer'],
  setup(props, { emit }) {
    const router = useRouter();
    const handlePersonalityChange = (id) => emit('update:currentPersonality', id);
    const toggleDarkMode = () => emit('update:isDark', !props.isDark);
    // The default switcher is a one-click CYCLE: compute the next locale from the
    // registry order and set it. "Cycle" is purely this UI affordance, built on
    // setLocale(code) (the core primitive) — a site that overrides this slot can
    // instead render a dropdown calling ctx.setLocale(code) for any number of
    // languages, with no core change.
    const switchLanguage = () => {
      const codes = LOCALES.map((l) => l.code);
      const i = codes.indexOf(props.currentLocale);
      emit('set-locale', codes[(i + 1) % codes.length]);
    };
    const toggleDrawer = () => emit('toggle-drawer');
    const goHome = () => router.push(paths.home());
    const prefetchSearch = () => {
      fetchSearchIndex();
    };

    return {
      handlePersonalityChange,
      toggleDarkMode,
      switchLanguage,
      toggleDrawer,
      goHome,
      prefetchSearch,
      navigationItems,
      paths,
      localeLabel,
      t
    };
  },
  template: `
    <v-app-bar 
      flat 
      class="glass-panel px-md-10 sticky-nav" 
      style="top: 0;"
    >
      <!-- Mobile Hamburger Menu -->
      <v-app-bar-nav-icon class="hidden-md-and-up" @click.stop="toggleDrawer"></v-app-bar-nav-icon>

      <v-app-bar-title
        class="font-weight-black text-h5 cursor-pointer font-heading"
        role="link"
        tabindex="0"
        @click="goHome"
        @keydown.enter.prevent="goHome"
        @keydown.space.prevent="goHome"
      >
        <span class="text-primary">{{ siteConfig.title || '' }}</span>
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Navigation Buttons -->
      <div class="hidden-sm-and-down">
        <v-btn
          v-for="item in navigationItems"
          :key="item.key"
          :to="item.path()"
          variant="text"
          class="font-weight-bold"
        >
          {{ t(item.key) }}
        </v-btn>
      </div>
      
      <v-divider vertical class="mx-2 my-auto hidden-sm-and-down" style="height: 24px"></v-divider>

      <!-- Language Switcher -->
      <v-btn variant="text" @click="switchLanguage" class="font-weight-bold mx-1" :title="t('ui.switchLanguage')">
        <v-icon start>mdi-translate</v-icon>
        {{ localeLabel(currentLocale) }}
      </v-btn>

      <v-divider vertical class="mx-2 my-auto" style="height: 24px"></v-divider>

      <!-- Personality Selector Menu (Desktop Only) -->
      <v-menu transition="scale-transition">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" :title="t('ui.switchColorScheme', { name: currentPersonality })" :aria-label="t('ui.switchColorScheme', { name: currentPersonality })" class="hidden-sm-and-down">
            <v-icon>mdi-palette-outline</v-icon>
          </v-btn>
        </template>
        <v-list class="glass-panel">
          <personality-list
            :personalities="personalities"
            :current-personality="currentPersonality"
            @select="handlePersonalityChange"
          ></personality-list>
        </v-list>
      </v-menu>

      <!-- Light/Dark Mode Toggle -->
      <v-btn icon @click="toggleDarkMode" :title="isDark ? t('ui.switchToLight') : t('ui.switchToDark')" :aria-label="isDark ? t('ui.switchToLight') : t('ui.switchToDark')">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <v-btn icon :to="paths.search()" :title="t('menu.search')" :aria-label="t('menu.search')" @mouseenter="prefetchSearch" @focus="prefetchSearch">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
    </v-app-bar>
  `
};
