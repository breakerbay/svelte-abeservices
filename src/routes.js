import Home from './components/Home.svelte'

import AboutUs from './cdms/footer/AboutUs.svelte'
import Acknowledgements from './cdms/footer/Acknowledgements.svelte'
import Charges from './cdms/footer/Charges.svelte'

import CollapsibleCards from './components/CollapsibleCards.svelte'
import Images from './components/Images.svelte'
import StaticImages from './components/StaticImages.svelte'
import NotFound from './components/NotFound.svelte'

// Route dictionary
export default {
    '/': Home,
    
    '/about': AboutUs,
    '/acknowledgements': Acknowledgements,  
    '/charges': Charges,    
    
    '/images': Images,
    '/static-images': StaticImages,
    '/cards': CollapsibleCards,
    // Catch-all route, must be last
    '*': NotFound
}
