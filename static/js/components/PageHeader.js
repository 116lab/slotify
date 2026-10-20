export default {
  name: 'PageHeader',
  props: {
    title: { type: String, required: true },
    icon: { type: String, required: true }
  },
  template: `
    <h1 class="page-header-title font-heading text-h3 font-weight-bold mb-8 px-8 text-primary">
      <v-icon class="mr-2" color="primary">{{ icon }}</v-icon>
      {{ title }}
    </h1>
  `
};
