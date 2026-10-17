import { NextResponse } from 'next/server';
import { 
  getAllCustomRecipes, 
  getCustomRecipeById, 
  saveCustomRecipe, 
  deleteCustomRecipe,
  calculateRecipeNutrients 
} from '@/lib/db';

export async function GET() {
  try {
    const customRecipes = getAllCustomRecipes();
    return NextResponse.json({
      success: true,
      recipes: customRecipes,
    });
  } catch (error) {
    console.error('Error fetching custom recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch custom recipes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Calcul en temps réel des macros sans sauvegarder (pour le live preview)
    if (body.action === 'calculate' && Array.isArray(body.ingredients)) {
      const nutrients = calculateRecipeNutrients(body.ingredients, body.servings || 1);
      return NextResponse.json({
        success: true,
        nutrients,
      });
    }

    // 2. Suppression d'une recette
    if (body.action === 'delete' && body.id) {
      deleteCustomRecipe(body.id);
      return NextResponse.json({
        success: true,
        recipes: getAllCustomRecipes(),
      });
    }

    // 3. Sauvegarde / Création / Mise à jour d'une recette
    const recipeData = body.recipe || body;
    if (!recipeData.title || !recipeData.ingredients) {
      return NextResponse.json(
        { error: 'Titre et ingrédients requis pour enregistrer une recette' },
        { status: 400 }
      );
    }

    const savedRecipe = saveCustomRecipe(recipeData);

    return NextResponse.json({
      success: true,
      recipe: savedRecipe,
      recipes: getAllCustomRecipes(),
    });
  } catch (error) {
    console.error('Error saving custom recipe:', error);
    return NextResponse.json({ error: 'Failed to save custom recipe' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de recette manquant' }, { status: 400 });
    }

    deleteCustomRecipe(id);

    return NextResponse.json({
      success: true,
      recipes: getAllCustomRecipes(),
    });
  } catch (error) {
    console.error('Error deleting custom recipe:', error);
    return NextResponse.json({ error: 'Failed to delete custom recipe' }, { status: 500 });
  }
}
