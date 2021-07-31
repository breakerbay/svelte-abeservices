<script>
    import Router from 'svelte-spa-router'
    import routes from './routes.js';

    import Navbar from './components/Navbar.svelte';
</script>
<div class="f-container fixed-hf">
    <Navbar/>
    <div class="main">
        <section>
            <Router {routes}/>
        </section>
    </div>
    <footer>
<!--
        <p align="center"><a href="#/about">About us</a> | <a href="#/terms">Terms</a>
            | <a href="#/charges">Charges</a> | <a href="#/privacy">Privacy
                Statement</a> | <a href="#/acknowledgements">Acknowledgements</a></p>
-->
        <p align="center"><a href="#/privacy">Privacy Statement</a> | <a href="#/acknowledgements">Acknowledgements</a></p>
        <p align="center">Copyright @2021 ABE Services</p>
    </footer>
</div>
