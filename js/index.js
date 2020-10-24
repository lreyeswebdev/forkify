/**************************************************
* HTML Elements
****************************************************/
const searchBtn = document.querySelector('.search__btn')
const searchField = document.querySelector('.search__field')
const resultsList = document.querySelector('.results__list')
const resultsPages = document.querySelector('.results__pages')
const searchRes = document.querySelector('.results')
const recipeDiv = document.querySelector('.recipe')
const shoppingList = document.querySelector('.shopping__list')
const likesMenu = document.querySelector('.likes__field')
const likesList = document.querySelector('.likes__list')

const elementStrings = {
    loader: 'loader'
}


/**************************************************
* Global State of the App
****************************************************/

const state = {};


/**************************************************
* Loader
****************************************************/

const displayLoader = parent => {
    const loader = `
        <div class="${elementStrings.loader}">
        <svg>
            <use href="img/icons.svg#icon-cw"></use>
        </svg>
        </div>
    `;
    parent.insertAdjacentHTML('afterbegin', loader);
};

const clearLoader = () => {
    const loader = document.querySelector(`.${elementStrings.loader}`);
    if (loader) loader.parentElement.removeChild(loader);
};


/**************************************************
* Recipe Search
****************************************************/

class Search {
    constructor(query) {
        this.query = query;
    }

    async getResults(query) {
        try {
            const result = await fetch(`https://forkify-api.herokuapp.com/api/search?q=${query}`)
            const data = await result.json()
            this.recipes = data.recipes;
        } catch (error) {
            alert(error);
        }
    }
}

// Clear values
const clearInput = () => {
    searchField.value = '';
};

const clearResults = () => {
    resultsList.innerHTML = '';
    resultsPages.innerHTML = '';
};

// Highlight Selected Recipe
const highlightSelected = id => {
    const resultsArr = Array.from(document.querySelectorAll('.results__link'));
    resultsArr.forEach(el => {
      el.classList.remove('results__link--active');
    })
    document.querySelector(`.results__link[href*="#${id}"]`).classList.add('results__link--active');
};

// Display Search Results
const displayRecipe = recipe => {
    const markup = `
      <li>
          <a class="results__link results" href="#${recipe.recipe_id}">
              <figure class="results__fig">
                  <img src="${recipe.image_url}" alt="${recipe.title}">
              </figure>
              <div class="results__data">
                  <h4 class="results__name">${recipe.title}</h4>
                  <p class="results__author">${recipe.publisher}</p>
              </div>
          </a>
      </li>
    `;
    resultsList.insertAdjacentHTML('beforeend', markup);
}

// Results page buttons
const createButton = (page, type) => `
    <button class="btn-inline results__btn--${type}" data-goto=${type === 'prev' ? page - 1 : page + 1}>
        <span>Page ${type === 'prev' ? page - 1 : page + 1}</span>
        <svg class="search__icon">
            <use href="img/icons.svg#icon-triangle-${type === 'prev' ? 'left' : 'right'}"></use>
        </svg>
    </button>
`;

const displayButtons = (page, numResults, resPerPage) => {
  const pages = Math.ceil(numResults / resPerPage);

  let button;
  if (page === 1 && pages > 1) {
    // button to go to next page only
    button = createButton(page, 'next');
  } else if (page < pages) {
    // both buttons
    button = `
      ${createButton(page, 'prev')}
      ${createButton(page, 'next')}
    `;
  } else if (page === pages && pages > 1) {
    // button to go to prev page only
    button = createButton(page, 'prev');
  }

  resultsPages.insertAdjacentHTML('afterbegin', button);
};

const displayResults = (recipes, page = 1, resPerPage = 10) => {
  // show results of current page
  const start = (page -1) * resPerPage;
  const end = page * resPerPage;

  recipes.slice(start, end).forEach(displayRecipe);

  // display pagination buttons
  displayButtons(page, recipes.length, resPerPage);
};

// Recipe search functionality
const searchCtrl = async () => {
    const query = searchField.value;    

    if (query) {
        state.search = new Search(query);        

        clearInput();
        clearResults();
        displayLoader(searchRes);

        try {
            await state.search.getResults(query);
            clearLoader();
            displayResults(state.search.recipes);
        } catch (err) {
            alert('Something went wrong with the search...');
            clearLoader();
        }
    }
}

// Recipe search event listeners
searchBtn.addEventListener('click', e => {
    e.preventDefault();
    searchCtrl();
});

resultsPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        clearResults();
        displayResults(state.search.recipes, goToPage);
    }
});


/**************************************************
* Selected Recipe/ Main recipe section
****************************************************/

class Recipe {
    constructor(id) {
        this.id = id;
    }

    async getRecipe() {
        try {
            const result = await fetch(`https://forkify-api.herokuapp.com/api/get?rId=${this.id}`)
            const data = await result.json()
            this.title = data.recipe.title;
            this.author = data.recipe.publisher;
            this.img = data.recipe.image_url;
            this.url = data.recipe.source_url;
            this.ingredients = data.recipe.ingredients;

        } catch (error) {
            console.log(error);
        }
    }

    calcTime() {
        // Assuming that we need 15 min for each 3 ingredients
        const numIng = this.ingredients.length;
        const periods = Math.ceil(numIng / 3);
        this.time = periods * 15;
    }
    
    calcServings() {
        this.servings = 4;
    }

    parseIngredients() {
        const unitsLong = ['tablespoons', 'tablespoon', 'ounces', 'ounce', 'teaspoons', 'teaspoon', 'cups', 'pounds'];
        const unitsShort = ['tbsp', 'tbsp', 'oz', 'oz', 'tsp', 'tsp', 'cup', 'pound'];
        const units = [...unitsShort, 'kg', 'g'];
    
        const newIngredients = this.ingredients.map(el => {
            // 1) Uniform units
            let ingredient = el.toLowerCase();
            unitsLong.forEach((unit, i) => {
                ingredient = ingredient.replace(unit, unitsShort[i]);
            });
    
            // 2) Remove parenthesis
            ingredient = ingredient.replace(/ *\([^)]*\) */g, ' ');
        
            // 3) Parse ingredients into count, unit and ingredient
            const arrIng = ingredient.split(' ');
            const unitIndex = arrIng.findIndex(el2 => units.includes(el2));
    
            let objIng;
            if (unitIndex > -1) {
                // There is a unit
                // Ex. 4 1/2 cups, arrCount is [4, 1/2] => eval("4+1/2") => 4.5
                // Ex. 4 cups, arrCount is [4]
                const arrCount = arrIng.slice(0, unitIndex);
                let count;
                if (arrCount.length === 1) {
                count = eval(arrIng[0].replace('-', '+'));
                } else {
                count = eval(arrIng.slice(0, unitIndex).join('+'));
                }
        
                objIng = {
                    count,
                    unit: arrIng[unitIndex],
                    ingredient: arrIng.slice(unitIndex + 1).join(' ')
                }
    
            } else if (parseInt(arrIng[0], 10)) {
                // There is NO unit, but first element is a number
                objIng = {
                    count: parseInt(arrIng[0], 10),
                    unit: '',
                    ingredient: arrIng.slice(1).join(' ')
                }
            } else if (unitIndex === -1) {
                // There is no unit and no number in first position
                objIng = {
                    count: 1,
                    unit: '',
                    ingredient
                }
            }
    
            return objIng;
        });
        this.ingredients = newIngredients;
    }
    
    updateServings (type) {
        // servings
        const newServings = type === 'dec' ? this.servings -1 : this.servings + 1;
    
        // ingredients
        this.ingredients.forEach(ing => {
            ing.count *= (newServings / this.servings);
        });
    
        this.servings = newServings;
    }
}

// Clear values
const clearRecipe = () => {
    recipeDiv.innerHTML =  '';
};

// Convert decimal to fractions
const toFraction = function (x, tolerance) {
    if(isNaN(x)) return ""
    if(x === null) return ""
    let whole = parseInt(x)
    let fractional = x - whole
    if (fractional == 0) return `${whole}`
    if (fractional < 0) fractional = -x;
    if (!tolerance) tolerance = 0.0001;
    let num = 1, den = 1;
    function iterate() {
        let R = num/den;
        if (Math.abs((R-fractional)/fractional) < tolerance) return;
        if (R < fractional) num++;
        else den++;
        iterate();
    }
    iterate();
    let retVal = `${num}/${den}`
    if(whole > 0) retVal = whole + " " + retVal
    return retVal
};

// Ingredients format
const createIngredient = ingredient =>`
    <li class="recipe__item">
        <svg class="recipe__icon">
            <use href="img/icons.svg#icon-check"></use>
        </svg>
        <div class="recipe__count">${toFraction(ingredient.count)}</div>
        <div class="recipe__ingredient">
            <span class="recipe__unit">${ingredient.unit}</span>
            ${ingredient.ingredient}
        </div>
    </li>
`;

// Display selected recipe
const showSelectedRecipe = (recipe, isLiked) => {
    const markup = `
        <figure class="recipe__fig">
            <img src="${recipe.img}" alt="${recipe.title}" class="recipe__img">
            <h1 class="recipe__title">
                <span>${recipe.title}</span>
            </h1>
        </figure>
        <div class="recipe__details">
            <div class="recipe__info">
                <svg class="recipe__info-icon">
                    <use href="img/icons.svg#icon-stopwatch"></use>
                </svg>
                <span class="recipe__info-data recipe__info-data--minutes">${recipe.time}</span>
                <span class="recipe__info-text"> minutes</span>
            </div>
            <div class="recipe__info">
                <svg class="recipe__info-icon">
                    <use href="img/icons.svg#icon-man"></use>
                </svg>
                <span class="recipe__info-data recipe__info-data--people">${recipe.servings}</span>
                <span class="recipe__info-text"> servings</span>
  
                <div class="recipe__info-buttons">
                    <button class="btn-tiny btn-decrease">
                        <svg>
                            <use href="img/icons.svg#icon-circle-with-minus"></use>
                        </svg>
                    </button>
                    <button class="btn-tiny btn-increase">
                        <svg>
                            <use href="img/icons.svg#icon-circle-with-plus"></use>
                        </svg>
                    </button>
                </div>
  
            </div>
            <button class="recipe__love">
                <svg class="header__likes">
                <use href="img/icons.svg#icon-heart${isLiked ? '' : '-outlined'}"></use>
                </svg>
            </button>
        </div>
  
  
  
        <div class="recipe__ingredients">
            <ul class="recipe__ingredient-list">
                ${recipe.ingredients.map(el => createIngredient(el)).join('')}
  
            </ul>
  
            <button class="btn-small recipe__btn recipe__btn--add">
                <svg class="search__icon">
                    <use href="img/icons.svg#icon-shopping-cart"></use>
                </svg>
                <span>Add to shopping list</span>
            </button>
        </div>
  
        <div class="recipe__directions">
            <h2 class="heading-2">How to cook it</h2>
            <p class="recipe__directions-text">
                This recipe was carefully designed and tested by
                <span class="recipe__by">${recipe.author}</span>. Please check out directions at their website.
            </p>
            <a class="btn-small recipe__btn" href="${recipe.url}" target="_blank">
                <span>Directions</span>
                <svg class="search__icon">
                    <use href="img/icons.svg#icon-triangle-right"></use>
                </svg>
  
            </a>
        </div>
    `;
    recipeDiv.insertAdjacentHTML('afterbegin', markup);
};

const updateServingsIngredients = recipe => {
    // Update servings
    document.querySelector('.recipe__info-data--people').textContent = recipe.servings;
  
    // Update ingredients
    const countElements = Array.from(document.querySelectorAll('.recipe__count'));
    countElements.forEach((el, i) => {
        el.textContent = toFraction(recipe.ingredients[i].count);
    });
};

// Selected recipe functionality
const recipeCtrl = async () => {
    // Get ID from url (selected/ clicked recipe)
    const id = window.location.hash.replace('#', '');
    //console.log(id); - okay

    if (id) {
        clearRecipe();
        displayLoader(recipeDiv);

        // Highlight selected search item
        if (state.search) highlightSelected(id);

        // Create new recipe object
        state.recipe = new Recipe(id);
        //console.log(state.recipe);

        try {
            // Get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            // Calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServings();

            // Display recipe
            clearLoader();
            showSelectedRecipe(
                state.recipe,
                state.likes.isLiked(id)
            );
            //console.log(state.recipe);

        } catch (error) {
            alert('Error processing recipe!');
        }
    }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, recipeCtrl));


/**************************************************
* Add to shopping list
****************************************************/

class List {
    constructor() {
        this.items = [];
    }

    addItem(count, unit, ingredient) {
        let ID;
        if (this.items.length > 0) {
            ID = this.items[this.items.length - 1].id + 1;
        } else {
            ID = 0;
        }

        const item = {
            id: ID,
            count,
            unit,
            ingredient
        }
        this.items.push(item);
        return item;
    }

    deleteItem(id) {
        const index =  this.items.findIndex(el => el.id === id);
        this.items.splice(index, 1);
    }

    updateCount(id, newCount) {
        this.items.find(el => el.id == id).count = newCount;
    }
}

// Display the shopping list items
const displayItem = item => {
    const markup = `
    <li class="shopping__item" data-itemid=${item.id}>
        <div class="shopping__count">
            <input type="number" value="${item.count}" step="${item.count}" class="shopping__count-value">
            <p>${item.unit}</p>
        </div>
        <p class="shopping__description">${item.ingredient}</p>
        <button class="shopping__delete btn-tiny">
            <svg>
                <use href="img/icons.svg#icon-circle-with-cross"></use>
            </svg>
        </button>
    </li>
    `;
    shoppingList.insertAdjacentHTML('beforeend', markup);
};

const deleteItem = id => {
    const item = document.querySelector(`[data-itemid="${id}"]`);
    if (item) item.parentElement.removeChild(item);
};

// Shopping list functionality
const listCtrl = () => {
    // Create new list if none exists
    if (!state.list) state.list = new List();

    // Add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        displayItem(item);
    });
};

// Event handlers for shopping list
shoppingList.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle the delete button
    if (e.target.matches('.shopping__delete *')) {

        // Delete from state
        state.list.deleteItem(id);

        // Delet from UI
        deleteItem(id);

    // Handle count update
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        state.list.updateCount(id, val);        
    }
});

/**************************************************
* Liked Recipes
****************************************************/

class Likes {
    constructor() {
        this.likes = [];
    }

    addLike(id, title, author, img) {
        const like = { id, title, author, img };
        this.likes.push(like);

        // Save data in localstorage
        this.persistData();
        return like;
    }

    deleteLike(id) {
        const index = this.likes.findIndex(el => el.id === id);
        this.likes.splice(index, 1);

        // Save data in localstorage
        this.persistData();
    }

    isLiked(id) {
        return this.likes.findIndex(el => el.id === id) !== -1;
    }

    getNumLikes() {
        return this.likes.length;
    }

    persistData() {
        localStorage.setItem('likes', JSON.stringify(this.likes));
    }

    readStorage() {
        const storage = JSON.parse(localStorage.getItem('likes'));

        // restoring likes from localstorage
        if (storage) this.likes = storage;
    }
}

// Update like button if liked or unliked
const toggleLikeBtn = isLiked => {
    const iconString = isLiked ? 'icon-heart' : 'icon-heart-outlined';
    document.querySelector('.recipe__love use').setAttribute('href', `img/icons.svg#${iconString}`);
};

// Update like menu button if likes are present or not
const toggleLikeMenu = numLikes => {
    likesMenu.style.visibility = numLikes > 0 ? 'visible' : 'hidden';
};

// Display liked recipes
const displayLikes = like => {
    const markup = `
    <li>
        <a class="likes__link" href="#${like.id}">
            <figure class="likes__fig">
                <img src="${like.img}" alt="${like.title}">
            </figure>
            <div class="likes__data">
                <h4 class="likes__name">${like.title}</h4>
                <p class="likes__author">${like.author}</p>
            </div>
        </a>
    </li>
    `;
    likesList.insertAdjacentHTML('beforeend', markup);
};

// Remove unliked recipes
const deleteLike = id => {
    const el = document.querySelector(`.likes__link[href="#${id}"]`).parentElement;
    if (el) el.parentElement.removeChild(el);
}

// Liked recipes functionality
const likeCtrl = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;

    // User has not yet liked current recipe
    if (!state.likes.isLiked(currentID)) {
        // Add like to the state
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        )
        // Toggle the like button
        toggleLikeBtn(true);

        // Add like to UI list
        displayLikes(newLike);
    
    // User has liked current recipe
    } else {
        // Remove like from the state
        state.likes.deleteLike(currentID);

        // Toggle the like button
        toggleLikeBtn(false);

        // Remove like from UI list
        deleteLike(currentID);
    }
    toggleLikeMenu(state.likes.getNumLikes());
};

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();

    // Restore likes
    state.likes.readStorage();

    // Toggle like menu button
    toggleLikeMenu(state.likes.getNumLikes());

    // Render the existing likes
    state.likes.likes.forEach(like => displayLikes(like));
});

// Event handlers for recipe button clicks
recipeDiv.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease *')) {

      // Decrease button is clicked
      if (state.recipe.servings > 1) {
        state.recipe.updateServings('dec');
        updateServingsIngredients(state.recipe);
      }
    } else if (e.target.matches('.btn-increase *')) {

      // Increase button is clicked
      state.recipe.updateServings('inc');
      updateServingsIngredients(state.recipe);

    } else if (e.target.matches('.recipe__btn--add *')) {
      // Add ingredients to shopping list
      listCtrl();

    } else if (e.target.matches('.recipe__love *')) {
      // Like controller
      likeCtrl();
    }
});