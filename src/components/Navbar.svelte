<!--Based on https://linguinecode.com/post/create-a-navbar-in-svelte-->

<script>
    import { onMount } from "svelte";

    // Show mobile icon and display menu
    let showMobileMenu = false;

    // List of navigation items
    const navItems = [
        { label: "Home", href: "#" },
        { label: "CAS", href: "#/cas" },
        { label: "CAS2", href: "#/cas2" },
        { label: "CAS3", href: "#/cas3" },
        { label: "Service", href: "#/service" },
        { label: "Contact Us", href: "#/contact" },
        // { label: "Links", href: "#/links" },
        // { label: "News", href: "#/news" },
        // { label: "Login", href: "#/login" },
        // { label: "Cards", href: "#/cards" },
        // { label: "Static Images", href: "#/static-images" }
        // { label: "Images", href: "#/images" }
    ];

    const handleNavBarClick = (event) => {
        console.log('handleNavBarClick event target', event.target);
        showMobileMenu = false;

        let element = document.querySelector("a.active");

        if (element) {
            console.log('a.active:', element);
            element.classList.remove("active");
        }
        else {
            console.log("no active links");
        }

        event.target.classList.add("active");
    }

    // Mobile menu click event handler
    const handleMobileIconClick = () => (showMobileMenu = !showMobileMenu);

    // CLose mobile menu when menu item selected
    const closeMobileMenu = () => (showMobileMenu = false);

    // Media match query handler
    const mediaQueryHandler = e => {
        // Reset mobile state
        if (!e.matches) {
            showMobileMenu = false;
        }
    };

    // Attach media query listener on mount hook
    onMount(() => {
        const mediaListener = window.matchMedia("(max-width: 767px)");

        mediaListener.addListener(mediaQueryHandler);

        let menuItems = document.querySelectorAll('.navbar-list li a');

        let i = 0;
        for (i = 0; i <  menuItems.length; i++) {
            // menuItems[i].addEventListener('click', closeMobileMenu, false);
            menuItems[i].addEventListener('click', handleNavBarClick, false);
        }
    });
</script>

<nav>
    <div class="inner">
        <div on:click={handleMobileIconClick} class={`mobile-icon${showMobileMenu ? ' active' : ''}`}>
            <div class="middle-line"></div>
        </div>
	<div><img src="abelogo3.gif" alt="ABE Services Logo"></div>
	<h3 class="logo">Construction Assurance Solutions (CAS)</h3>
        <ul class={`navbar-list${showMobileMenu ? ' mobile' : ''}`}>
            {#each navItems as item}
                <li>
                    <a href={item.href}>{item.label}</a>
                </li>
            {/each}
        </ul>
    </div>
</nav>

<style>
    /*TODO - Change background to blue */
    nav {
        /*background-color: rgba(0, 0, 0, 0.8);*/
        background-color: #2780e3;
	    font-family: Arial, Helvetica, sans-serif;
        height: var(--navbar-height);
    }

    .inner {
        max-width: 980px;
        padding-left: 20px;
        padding-right: 20px;
        margin: auto;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        height: 100%;
    }

    .mobile-icon {
        width: 25px;
        height: 14px;
        position: relative;
        cursor: pointer;
    }


    .mobile-icon:after,
    .mobile-icon:before,
    .middle-line {
        content: "";
        position: absolute;
        width: 100%;
        height: 2px;
        background-color: #fff;
        transition: all 0.4s;
        transform-origin: center;
    }

    .middle-line {
        margin: auto;
    }

    .mobile-icon:hover:before,
    .mobile-icon:hover:after,
    .mobile-icon.active:before,
    .mobile-icon.active:after,
    .mobile-icon.active .middle-line {
        width: 100%;
    }

    .mobile-icon.active:before,
    .mobile-icon.active:after {
        top: 50%;
        transform: rotate(-45deg);
    }

    .mobile-icon.active .middle-line {
        transform: rotate(45deg);
    }

    .navbar-list {
        display: none;
        width: 100%;
        justify-content: space-between;
        margin: 0;
        padding: 0 40px;
    }


    .navbar-list.mobile {
        background-color: rgba(0, 0, 0, 0.8);
        position: fixed;
        display: block;
        height: calc(100% - 45px);
        bottom: 0;
        left: 0;
    }

    .navbar-list li {
        list-style-type: none;
        position: relative;
    }

    .navbar-list li:before {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background-color: #424245;
    }

    .navbar-list a {
        color: #fff;
        text-decoration: none;
        display: flex;
        /*height: 45px;*/
        height: var(--navbar-height);
        align-items: center;
        padding: 0 10px;
        font-size: 13px;
    }

    .navbar-list a:hover {
        background-color: #1967be;
    }

    .active {
        background-color: #1967be;
    }

    @media only screen and (min-width: 767px) {
        .mobile-icon {
            display: none;
        }

        .logo {
            width: 100%;
            color: #fff;
        }

        img {
            width: auto;
            height: 60px;
            object-fit: contain;
            margin-right: 0.5rem;
        }

        .navbar-list {
            display: flex;
	        justify-content: flex-end;
            padding: 0;
        }

        .navbar-list a {
            display: inline-flex;
        }
    }
</style>
