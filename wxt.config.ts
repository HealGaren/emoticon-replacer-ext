import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: [
        '@wxt-dev/module-react',
        '@wxt-dev/auto-icons'
    ],
    manifest: {
        permissions: ['<all_urls>'],
        // host_permissions: ['']
    }
});
