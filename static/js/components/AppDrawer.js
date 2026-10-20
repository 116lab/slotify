/**
 * AppDrawer.js
 * Mobile navigation drawer component.
 */
import { t } from '../i18n.js';
import { navigationItems } from '../config/routes.js';
import PersonalityList from './PersonalityList.js';

export default {
  components: { PersonalityList },
  props: {
    modelValue: { type: Boolean, required: true },
    personalities: { type: Array, required: true },
    currentPersonality: { type: String, required: true }
  },
  emits: ['update:modelValue', 'update:currentPersonality'],
  setup(_props, { emit }) {
    const handlePersonalityChange = (id) => {
      emit('update:currentPersonality', id);
      emit('update:modelValue', false);
    };

    const closeDrawer = () => emit('update:modelValue', false);

    return { handlePersonalityChange, closeDrawer, navigationItems, t };
  },
  template: `
    <v-navigation-drawer 
      :model-value="modelValue" 
      @update:model-value="$emit('update:modelValue', $event)"
      temporary 
      class="glass-panel"
    >
      <v-list class="mt-4">
        <v-list-item
          v-for="item in navigationItems"
          :key="item.key"
          :to="item.path()"
          :exact="item.exact"
          :prepend-icon="item.icon"
          :title="t(item.key)"
          @click="closeDrawer"
        ></v-list-item>
      </v-list>
      <v-divider class="my-4"></v-divider>
      <v-list>
        <!-- Personality Selector in Drawer -->
        <v-list-group value="Themes">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-palette" :title="t('ui.themeStyle')"></v-list-item>
          </template>
          <personality-list
            :personalities="personalities"
            :current-personality="currentPersonality"
            @select="handlePersonalityChange"
          ></personality-list>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>
  `
};
