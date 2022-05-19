import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { createRecipe, getAllRecipes, getRecipe } from '../services/recipe.service';
import { requestLogger } from '../../config/winston';
import { body, check, matchedData, param, query, ValidationChain, validationResult } from 'express-validator';
import { ValidationException } from '../../errors/ValidationException';
import prisma from '../../config/prisma';
import { difficulty, media, taste, unit } from '../../config/models';

const router = Router();

const FilterValidation: ValidationChain[] = [
    query('name').if(query('name').exists()).isString(),
    query('servings').if(query('servings').exists()).isNumeric().toInt(),
    query('time').if(query('time').exists()).isNumeric().toInt(),
    query('reference').if(query('reference').exists()).isString(),
    query('difficulty').if(query('difficulty').exists()).toLowerCase().isIn(Object.keys(difficulty)),
    query('media').if(query('media').exists()).toLowerCase().isIn(Object.keys(media)),
    query('taste').if(query('taste').exists()).toLowerCase().isIn(Object.keys(taste)),
    query('vegetarian').if(query('vegetarian').exists()).isBoolean().toBoolean(),
];

const throwIfInvalid: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        throw new ValidationException(result);
    }

    return next();
};

//get all/filtered recipes
router.get('/recipes', ...FilterValidation, throwIfInvalid, async (req: Request, res: Response) => {
    requestLogger(req);
    const result = await getAllRecipes(matchedData(req));
    res.json(result);
});

//get recipe detail
router.get(
    '/recipe/:id',
    param('id').isLength({ min: 25, max: 25 }),
    throwIfInvalid,
    async (req: Request, res: Response) => {
        requestLogger(req);
        const result = await getRecipe(matchedData(req).id);
        if (!result) {
            return res.status(404).send('Entity not found');
        }
        res.json(result);
    },
);

const RecipeValidation: ValidationChain[] = [
    body('name').isString(),
    body('description').isString(),
    body('servings').isNumeric(),
    body('time').isNumeric(),
    body('reference').isString(),
    body('difficulty').toLowerCase().isIn(Object.keys(difficulty)),
    body('media').toLowerCase().isIn(Object.keys(media)),
    body('taste').toLowerCase().isIn(Object.keys(taste)),
    body('vegetarian').isBoolean(),

    check('ingredients.*.name').isString(),
    check('ingredients.*.amount').isNumeric(),
    check('ingredients.*.unit').toLowerCase().isIn(Object.keys(unit)),
];

//create recipe
router.post('/recipe', ...RecipeValidation, throwIfInvalid, async (req: Request, res: Response) => {
    requestLogger(req);
    const result = await createRecipe(req.body);
    res.json(result);
});

//delete recipe
router.delete(
    '/recipe/:id',
    param('id').trim().isLength({ min: 25, max: 25 }),
    throwIfInvalid,
    async (req: Request, res: Response) => {
        requestLogger(req);
        await prisma.recipes.delete({ where: { id: matchedData(req).id } });
        res.send('Success');
    },
);

export default router;
