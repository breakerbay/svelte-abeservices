# svelte-abeservices
draft abeservices web site

Demo: https://abeservices.netlify.app/

# PWA Settings

## PWA Optimized 
### Maskable icons
[Maskable.app Editor](https://maskable.app/editor) used to generate maskable PWA icons from abelogo3.gif.



# Service Worker
https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle
https://jakearchibald.github.io/isserviceworkerready/resources.html

# Service Worker Examples
https://pwastarter.com/
https://pwastarter.love2dev.com/f2c63bf6-eed6-48c7-b56f-ab2265ecec1a/pwa.zip

https://www.netguru.com/blog/pwa-ios ios PWA specifics

https://www.charistheo.io/blog/2021/03/workbox-strategies-with-examples-and-use-cases/


https://www.npmjs.com/package/rollup-plugin-workbox

This is the project based on the following tutorial: [Build a Simple PWA based on Basic JavaScript using Google's Workbox](https://youtu.be/PL2DG9LJoVQ)
https://github.com/designcourse/vanillajs-workbox-pwa
https://youtu.be/PL2DG9LJoVQ

# Service Worker Strategies Required
Image precache
Background sync

# WorkBox
https://developers.google.com/web/tools/workbox
https://developers.google.com/web/tools/workbox/guides/common-recipes
https://developers.google.com/web/tools/workbox/guides/advanced-recipes

## WorkBox Strategies

[WorkBox Strategies](https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-strategies)

| Strategy      | Description | Usage |
| ----------- | ----------- | ----------- |
| CacheFirst     | A [cache-first](https://web.dev/offline-cookbook/#cache-falling-back-to-network) strategy, useful for assets that have been revisioned, e.g. URLs like /styles/example.a8f5f1.css, since they can be cached for long periods of time.       | Text        | 
| CacheOnly   | Text        | Text        |
| NetworkFirst     | Title       | Text        | 
| NetworkOnly   | Text        | Text        |
| StaleWhileRevalidate   | Text        | Text        |

## Workbox Plugins
[Workbox Plugins](https://developers.google.com/web/tools/workbox/guides/using-plugins)



| Plugin      | Description |
| ----------- | ----------- | 
| BackgroundSyncPlugin     | If a network request ever fails, add it to a background sync queue and retry the request when the next sync event is triggered.  | 
| Text   | Text        | Text        |


## WorkBox Settings

Increase Workbox's maximumFileSizeToCacheInBytes
PWA/workbox improvements - Switch to the Workbox InjectManifest plugin

# svelte-pwa-now
https://github.com/cerivitos/svelte-pwa-now

https://dev.to/arthurgermano/my-experience-building-a-pwa-app-with-svelte-js-4pme

# Svelte PWA templates
https://github.com/tretapey/svelte-pwa
npx degit tretapey/svelte-pwa my-svelte-pwa
cd my-svelte-pwa


https://github.com/100lvlmaster/svelte-pwa

# Favicon Generators
https://favicon.io/favicon-generator/


# Background Synch

if ('serviceWorker' in navigator && 'SyncManager' in window) {
* [SyncManager](https://developer.mozilla.org/en-US/docs/Web/API/SyncManager)

# Periodic Background Synch

* [ServiceWorkerRegistration.periodicSync](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/periodicSync)

The periodicSync read-only property of the ServiceWorkerRegistration interface returns a reference to the PeriodicSyncManager interface, which allows for registering of tasks to run at specific intervals.

* [Periodic Background Sync Explained](https://felixgerschau.com/periodic-background-sync-explained/)
* [Richer offline experiences with the Periodic Background Sync API](https://web.dev/periodic-background-sync/)

# Svelte Query
* [Svelte Query](https://sveltequery.vercel.app/)
* [svelte-query on github](https://github.com/SvelteStack/svelte-query)

# Fonts

https://www.fontspace.com/phoenix-font-f4186  - phoenix - REGULAR STYLE 100% Free
https://www.fontspace.com/gemfonts

https://www.behance.net/gallery/23357757/Timber-Free-Font

https://www.behance.net/gallery/24597223/STOKED-(free-font)

https://www.fonts.com/font/thinkdust/stripes?QueryFontType=Web&src=GoogleWebFonts
https://www.fonts.com/font/thinkdust/stripes


https://www.oberlo.com/blog/google-fonts
Cabin Sketch

https://bashooka.com/freebie/free-double-multi-line-fonts/

https://www.1001fonts.com/

https://www.fontspace.com/

https://www.abstractfonts.com/

https://designshack.net/articles/css/10-great-google-font-combinations-you-can-copy/
Lobster & Cabin
The HTML
<link href="https://fonts.googleapis.com/css?family=Lobster" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Cabin" rel="stylesheet">
The CSS

h1 {
font-family: 'Lobster', Georgia, Times, serif;
font-size: 70px;
line-height: 100px;
}

p {
font-family: 'Cabin', Helvetica, Arial, sans-serif;
font-size: 15px;
line-height: 25px;
}

The HTML
<link href="https://fonts.googleapis.com/css?family=Raleway" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Goudy+Bookletter+1911" rel="stylesheet">
The CSS
h1 {
font-family: 'Raleway', Helvetica, Arial, sans-serif;
font-size: 50px;
line-height: 70px;
}

p {
font-family: 'Goudy Bookletter 1911', Georgia, Times, serif;
font-size: 15px;
line-height: 25px;
}


https://www.myfonts.com/tags/double+line/

https://fonts.google.com/

