import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VFileUpload } from 'vuetify/labs/VFileUpload'
import { mdi } from 'vuetify/iconsets/mdi'
import App from './App.vue'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

const vuetify = createVuetify({
  components: {
    ...components,
    VFileUpload,
  },
  directives,
  icons: { defaultSet: 'mdi', sets: { mdi } }
})

const app = createApp(App)
app.use(createPinia())
app.use(vuetify)
app.mount('#app')

