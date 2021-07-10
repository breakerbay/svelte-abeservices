<script>
    import Router from 'svelte-spa-router'
    import routes from './routes.js';

    import Navbar from './components/Navbar.svelte';
</script>
<div class="f-container fixed-hf">
    <Navbar/>
    <div class="main">
        <div>
            <Router {routes}/>
        </div>
    </div>
    <footer>
        <p>I am the footer !!!</p>
    </footer>
</div>
