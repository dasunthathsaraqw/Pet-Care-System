import express from 'express'
import {listProducts, addProduct, removeProduct, singleProduct, updateProductQuantity} from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const productRouter = express.Router()

// Configure multer for multiple file uploads
const uploadFields = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]);

// Catalogue management restricted to store managers (fix for audit finding #1);
// /single and /list remain public reads.
productRouter.post('/add', requireRole(['store_manager']), uploadFields, addProduct);
productRouter.post('/remove', requireRole(['store_manager']), removeProduct);
productRouter.post('/single', singleProduct);
productRouter.get('/list', listProducts);
productRouter.post('/update-quantity', requireRole(['store_manager']), updateProductQuantity);

export default productRouter

