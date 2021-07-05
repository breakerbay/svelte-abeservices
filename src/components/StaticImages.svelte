<script>

 const photos = [
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1486942873/action1Image.png',
        text: 'action1Image.png',
        id: 0
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1506423474/kettle.png',
        text: 'kettle.png',
        id: 1
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1507436690/trisl.png',
        text: 'trisl.png',
        id: 2
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1509837209/tomatoes.png',
        text: 'tomatoes.png',
        id: 3
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1514277955/Brogo%20King%20Parrot.png',
        text: 'Brogo King Parrot.png',
        id: 4
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1564462303/solving%20problem.png',
        text: 'solving problem.png',
        id: 5
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1597699451/issue%201.png',
        text: 'issue 201.png',
        id: 6
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1606189965/specs%20used%20to%20check%20holes%20in%20walls.png',
        text: 'specs used to check holes in walls',
        id: 7
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1613263753/harbour%20entrance.png',
        text: 'harbour entrance.png',
        id: 8
    },
    {
        image: '//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1613263900/Pinnacles.png',
        text: 'Pinnacles.png',
        id: 9
    }
];

</script>

<style>
  .wrapper {
    max-width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(25em, 1fr));
    grid-auto-rows: minmax(10em, auto);
    gap: 3em;
    background-color: black;
    color: white;
    /*background-color: #fff;*/
    /*color: #444;*/
  }

  .box {
    /*background-color: rgb(120, 70, 123);*/
    background-color:  black;
    /*border: 5px solid rgb(88, 55, 112);*/
    border: 5px solid black;
    color: #fff;
    margin-right: 2em;
    border-radius: 5px;
    padding: 20px;
    font: 150%/1.3 "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans",
    Geneva, Verdana, sans-serif;
  }
</style>

<div class="wrapper">
  {#each photos as photo}
    <div class="box">
      <div>
        <img src={photo.image} alt={photo.text} />
      </div>
      <div>
        <p>
          {photo.text}
        </p>
      </div>
    </div>
  {/each}
</div>
