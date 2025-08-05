Hello 🙂‍↕️

Ive basically summarized everthing below. I mostly setup the JS side of things because we havent finalized designs but I can at least guess what our technical needs are.

The liquid files are not detailed since we would most likely change stuff based on where the design goes.

##[Our Design Principle]
I wanted the setup to enable us setup more fancy features like page transitions, preloaders without having one massive JS file. Shopify tends to care about bundle sizes and if we want to do this professionally, I thought it would be best to stick to their modules and lazy loading architecture.

For stuff like preloaders, page transition and smoothscroll, I have introduced Vite to handle all of that through the src directory and bundle it into one single app.js file and or multiple standalone files based on whats imported across our theme. Product specific code where we need to use packages like GSAP will also be defined in here [sections/ProductModal] will be exported to assets/section\_\_product-modal.js if app.js is loaded on a page with a product modal (I will probably use data attributes to match this)

We will also use dynamic imports just to reduce the potential bundle size a bit more for everything in the src directory

##[Naming Conventions]
I honestly despise the one giant assets folder so I thought adding prefixes based on either function, component or scope would help. These are the prefixes ive defined below (open to changes or adjustment as the project scales)

    -> global__ (prefixes files that affect the entire theme -> global__app.js (our js entry) and so on)
    -> snippet__ (prefixes snippets)
    -> section__ (prefixes sections)
    -> component__ (prefixes custom html components we create and stuff like navigation and so on)
    -> template__ (prefixes our main template js and css in case we need to handle anything major)

    As an example, a section named header would have the following
    	-> section__header.js
    	-> section__header.css

    	**That way its sorted in the explorer by both alphabetical order and type

##[Handling CSS]
This one was kind of annoying tbh, base css now has nested classes with pretty good support (i thought the support was bad initially) but I think SCSS is way nicer because of functions, mixins and so on so just like the global js, this would also be defined in the src directory and then be bundled into global\_\_styles.css by Vite.

\*\* there will probably be a few more adjustments as things go but for now this is a decent enough starting point

[*] Follow up - Todos for this week
[] Setup products on Shopify
[] Start work on the product overlay component (ill explain this one whenever we have the meeting [im kinda getting tired of writing docs 🙂‍↕️])

    	** Lets start small for now and gain momentum from there (I dont want to promise too much because I know we are both busy right now)

\*\* You have reached the end :)
