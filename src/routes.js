import CasHome from './cas/CasHome.svelte'
import CasHome2 from './cas/CasHome2.svelte'
import CasHome3 from './cas/CasHome3.svelte'

import Home from './components/Home.svelte'

import Clients from './cdms/body/Clients.svelte'
import Contractors from './cdms/body/Contractors.svelte'
import HowItWorks from './cdms//body/HowItWorks.svelte'

import AboutUs from './cdms/footer/AboutUs.svelte'
import Acknowledgements from './cdms/footer/Acknowledgements.svelte'
import Charges from './cdms/footer/Charges.svelte'
import Privacy from './cdms/footer/Privacy.svelte'
import Terms from './cdms/footer/Terms.svelte'

import ContactUs from './cdms/navbar/ContactUs.svelte'
import Links from './cdms/navbar/Links.svelte'
import Login from './cdms/navbar/Login.svelte'
import News from './cdms/navbar/News.svelte'
import Service from './cdms/navbar/Service.svelte'

import CollapsibleCards from './components/CollapsibleCards.svelte'
import Images from './components/Images.svelte'
import StaticImages from './components/StaticImages.svelte'
import NotFound from './components/NotFound.svelte'

// Route dictionary
export default {
    '/': Home,
    '/cas': CasHome,
    '/cas2': CasHome2,
    '/cas3': CasHome3,
    '/clients': Clients,
    '/contractors': Contractors,
    '/how': HowItWorks,
    '/how/*': HowItWorks,
    '/about': AboutUs,
    '/acknowledgements': Acknowledgements,
    '/charges': Charges,
    '/privacy': Privacy,
    '/terms': Terms,
    '/contact': ContactUs,
    '/links': Links,
    '/login': Login,
    '/news': News,
    '/service': Service,
    '/images': Images,
    '/static-images': StaticImages,
    '/cards': CollapsibleCards,
    // Catch-all route, must be last
    '*': NotFound
}
