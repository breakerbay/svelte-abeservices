import Home from './components/Home.svelte'

import Clients from './cdms/body/Clients.svelte'
import Contractors from './cdms/body/Contractors.svelte'
import HowItWorks from './cdms//body/HowItWorks.svelte'

import AboutUs from './cdms/footer/AboutUs.svelte'
import Acknowledgements from './cdms/footer/Acknowledgements.svelte'
import Charges from './cdms/footer/Charges.svelte'
import Privacy from './cdms/footer/Privacy.svelte'
import Terms from './cdms/footer/Terms.svelte'

import CollapsibleCards from './components/CollapsibleCards.svelte'
import Images from './components/Images.svelte'
import StaticImages from './components/StaticImages.svelte'
import NotFound from './components/NotFound.svelte'

// Route dictionary
export default {
    '/': Home,
    '/clients': Clients,
    '/contractors': Contractors,
    '/how': HowItWorks,    
    '/about': AboutUs,
    '/acknowledgements': Acknowledgements,  
    '/charges': Charges,  
    '/privacy': Privacy,
    '/terms': Terms,    
    
    '/images': Images,
    '/static-images': StaticImages,
    '/cards': CollapsibleCards,
    // Catch-all route, must be last
    '*': NotFound
}
