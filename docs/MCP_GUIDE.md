# Guide du Serveur MCP & API Mobile - FoodPlanner 🚀

FoodPlanner intègre un serveur **MCP (Model Context Protocol)** complet qui permet à vos agents d'intelligence artificielle (Claude Desktop, Cursor, Antigravity, Gemini API, Raccourcis iOS) d'interagir directement avec votre planificateur alimentaire, votre base SQLite et vos données d'épicerie Metro.

---

## 🛡️ Sécurité & Validation Humaine (Human-in-the-Loop)

Les 17 outils sont scrupuleusement partitionnés selon vos directives :

### 🟢 Sans validation humaine (Exécution directe)
1. `create_recipe` : Créer une recette (ingrédients, instructions, calcul automatique des calories et macros).
2. `schedule_meal` : Ajouter un plat à la programmation d'un jour (`ethan` ou `laurine`).
3. `update_catalog_item_price` : Modifier le prix d'achat d'un aliment au catalogue.
4. `add_custom_product` : Ajouter un nouvel aliment au catalogue (avec ou sans code-barres).
5. `get_daily_plan` : Consulter le menu du jour ou de la semaine.
6. `get_macro_status` : Consulter les objectifs métaboliques et macros.
7. `get_grocery_list` : Consulter la liste de courses consolidée Metro.
8. `add_to_grocery_list` : Ajouter des produits libres à la liste d'épicerie.
9. `get_pantry_items` : Consulter le stock du garde-manger.
10. `toggle_pantry_item` : Cocher/décocher un ingrédient en stock.
11. `set_product_preference` : Définir si un produit est aimé, neutre ou exclu.
12. `search_recipes` : Rechercher des recettes par nom ou tag.
13. `search_catalog` : Rechercher des articles dans le catalogue Metro.

### 🔴 Avec validation humaine obligatoire (`confirmed: boolean`)
Si l'IA appelle un de ces outils avec `confirmed: false` (défaut), l'action n'est **pas** exécutée. L'outil retourne un statut `requires_confirmation: true` avec un avertissement précis et ordonne à l'IA de demander l'accord explicite de l'utilisateur :
1. `delete_recipe` : Supprimer définitivement une recette.
2. `modify_recipe` : Modifier les ingrédients, portions ou étapes d'une recette.
3. `remove_scheduled_meal` : Déprogrammer un repas du planning.
4. `clear_day_schedule` : Effacer tout le planning d'une journée.
5. `delete_custom_product` : Supprimer un produit créé du catalogue.

---

## 🖥️ 1. Configuration MCP sur Ordinateur (Claude Desktop, Cursor, Antigravity)

### Option A : Lancement via `npm run mcp`
Le script est enregistré dans votre `package.json` :
```bash
npm run mcp
```

### Option B : Configuration `claude_desktop_config.json`
Dans votre fichier de configuration Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`) :
```json
{
  "mcpServers": {
    "food-planner": {
      "command": "npx",
      "args": ["-y", "tsx", "c:/Users/ethan/Documents/GitHub/food_planner/src/mcp/server.ts"],
      "cwd": "c:/Users/ethan/Documents/GitHub/food_planner"
    }
  }
}
```

---

## 📱 2. Utilisation sur Mobile (App Gemini / iPhone / Android)

> [!NOTE]
> **Pourquoi une passerelle HTTP ?**
> L'application officielle mobile Gemini (iOS et Android) ne permet pas encore de configurer directement des serveurs MCP locaux via `stdio` (qui nécessite un terminal local actif).
> Pour contourner cette limite et vous permettre de contrôler FoodPlanner depuis votre téléphone, nous avons créé une **passerelle HTTP REST (`/api/mcp`)** intégrée dans l'application web Next.js.

### Endpoint disponible :
- **Documentation et liste des outils** : `GET http://<votre-ip-locale>:3000/api/mcp`
- **Exécution d'un outil** : `POST http://<votre-ip-locale>:3000/api/mcp`

### Exemple d'appel HTTP (Format JSON-RPC standard) :
```json
POST /api/mcp
Content-Type: application/json

{
  "tool": "schedule_meal",
  "args": {
    "accountId": "ethan",
    "day": "Mardi",
    "mealSlot": "dinner",
    "recipeId": "custom_recipe_123"
  }
}
```

### 📲 Intégration sur iPhone (Raccourcis Siri / Gemini Shortcut) :
1. Ouvrez l'application **Raccourcis** sur iPhone.
2. Créez un raccourci vocal : *« Planifier repas FoodPlanner »* ou *« Ajouter épicerie »*.
3. Ajoutez l'action **« Obtenir le contenu de l'URL »** :
   - URL : `http://<ip_de_votre_pc_ou_serveur>:3000/api/mcp`
   - Méthode : `POST`
   - En-tête : `Content-Type: application/json`
   - Corps (JSON) :
     ```json
     {
       "tool": "add_to_grocery_list",
       "args": { "name": "Texte fourni", "amount": 1, "unit": "unite" }
     }
     ```
4. Vous pouvez également déclencher une requête Gemini API via un script Python ou Node.js qui relaie les questions en Function Calling directement vers `/api/mcp`.
