const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
   // find all products
   // be sure to include its associated Category and Tag data
   try {
     const productData = await Product.findAll({
       include: [{model: Category}, {model:Tag, through : ProductTag, as : 'product_tags'}],
     });
     res.status(200).json(productData);
   } catch (err) {
     res.status(500).json(err);
   }
 });

// get one product
router.get('/:id', async (req, res) => {
   // find a single product by its `id`
   // be sure to include its associated Category and Tag data
   try {
     const productData = await Product.findByPk(req.params.id, {
       include: [{model: Category}, {model:Tag, through : ProductTag, as : 'product_tags'}],
     });
     if(!productData){
       res.status(404).json({error: 404, message :`Could not find product with ID: ${req.params.id}`});
       return;
     }
     res.status(200).json(productData);
   }
   catch (err) {
     res.status(500).json(err);
   }
 });

// create new product
router.post('/', async (req, res) => {
   /* req.body should look like this...
     {
       product_name: "Basketball",
       price: 200.00,
       stock: 3,
       category_id : 3
       tagIds: [1, 2, 3, 4]
     }
   */
   try {
     const product = await Product.create(req.body);
     // if there's product tags, we need to create pairings to bulk create in the ProductTag model
     let resBody = {
       product: product
     }
     if (req.body.tagIds.length) {
       const productTagIdArr = req.body.tagIds.map((tag_id) => {
         return {
           product_id: product.id,
           tag_id,
         };
       });
       const productTagIds = await ProductTag.bulkCreate(productTagIdArr);
       //Add product tags to response
       resBody.productTags = productTagIds;
     }
     res.status(200).json(resBody);
   } catch (error) {
     res.status(400).json(error);
   }
 });

// update product
router.put('/:id', async (req, res) => {
  // update product data
  try {
    let productData = await Product.update(req.body, {
      where: {
        id: req.params.id,
      },
    })

    // find all associated tags from ProductTag
    let allProductData = await ProductTag.findAll({ where: { product_id: req.params.id } });

    // get list of current tag_ids
    const productTagIds = allProductData.map(({ tag_id }) => tag_id);

    // create filtered list of new tag_ids
    const newProductTags = req.body.tagIds
      .filter((tag_id) => !productTagIds.includes(tag_id))
      .map((tag_id) => {
        return {
          product_id: req.params.id,
          tag_id,
        };
      });

    // figure out which ones to remove
    const productTagsToRemove = productTagIds
      .filter((tag_id) => !req.body.tagIds.includes(tag_id))
      .map((id) => id);

    console.log(productTagsToRemove)
    // run both actions
    let destroyedTags = await ProductTag.destroy({ where: { 
      product_id : req.params.id,
      tag_id: productTagsToRemove }
     })
    let updatedProductTags = await ProductTag.bulkCreate(newProductTags)
    // console.log(updatedProductTags)
    res.status(200).json({productData : req.body, destroyedProductTags :destroyedTags, updatedProductTags : updatedProductTags});
  }
  catch (err) {
    // console.log(err);
    res.status(400).json(err);
  };
});

router.delete('/:id', async (req, res) => {
  // delete one product by its `id` value
  try {
    const deletedProduct = await Product.destroy({
      where : {
        id : req.params.id
      }
    })
    if(!deletedProduct){
      res.status(404).json({response : 404, deletedProduct : deletedProduct });
      return;
    }
    res.status(200).json({response : 200, deletedProduct : deletedProduct })
  } catch (error) {
    res.status(500).json(error)
  }
});

module.exports = router;