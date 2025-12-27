# 🔒 Log Anonymizer

> **Outil d'anonymisation de logs en temps réel** - Protégez vos données
> sensibles avant de les partager.

[![Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://yukhyshell5.github.io/logs-anonymizer/)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

## ✨ Fonctionnalités

### 🎯 Anonymisation Intelligente

- **Détection automatique** des patterns sensibles (emails, IPs, UUIDs,
  téléphones...)
- **Prévisualisation en temps réel** avec highlighting coloré
- **Mapping cohérent** - Les valeurs identiques reçoivent le même placeholder

### 🛠️ Outils Avancés

- **Regex Builder** - Interface visuelle pour créer des expressions régulières
- **Templates de logs** - Presets pour Apache, Nginx, JSON, Syslog, Docker, AWS
- **Import/Export** - Sauvegardez et partagez vos règles en JSON
- **Profils** - Gérez plusieurs configurations de règles

### 🔄 Productivité

- **Drag & Drop** - Glissez vos fichiers de logs directement
- **Bulk Import** - Importez plusieurs fichiers à la fois
- **Historique** - Restaurez des sessions précédentes
- **Undo/Redo** - Annulez vos modifications (Ctrl+Z / Ctrl+Shift+Z)

### 🎨 Interface

- **Mode sombre/clair** - Basculez selon vos préférences
- **Diff View** - Comparez l'original et l'anonymisé côte à côte
- **Recherche** - Trouvez rapidement dans vos logs (Ctrl+F)
- **Numéros de ligne** - Navigation facile dans les logs

## 🚀 Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/logs-anonymizer.git
cd logs-anonymizer

# Installer les dépendances
pnpm install

# Lancer en développement
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📖 Utilisation

### 1. Importer vos logs

- Collez directement dans la zone de texte
- Glissez-déposez un ou plusieurs fichiers
- Cliquez sur le bouton d'import

### 2. Configurer les règles

- Utilisez les **presets** prédéfinis (EMAIL, IP, UUID...)
- Créez des règles personnalisées avec le **Regex Builder**
- Importez un **template** adapté à votre format de log

### 3. Exporter le résultat

- Copiez le texte anonymisé (bouton ou Ctrl+Shift+C)
- Téléchargez le fichier
- Exportez le mapping pour dé-anonymiser plus tard

## ⌨️ Raccourcis clavier

| Raccourci      | Action              |
| -------------- | ------------------- |
| `Ctrl+Z`       | Annuler             |
| `Ctrl+Shift+Z` | Rétablir            |
| `Ctrl+S`       | Exporter les règles |
| `Ctrl+Shift+C` | Copier l'anonymisé  |
| `Ctrl+D`       | Vue diff            |
| `Ctrl+F`       | Recherche           |

## 🏗️ Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS 4
- **UI Components** : shadcn/ui (Radix UI)
- **State** : React hooks + localStorage
- **Icons** : Lucide React

## 📁 Structure du projet

```
src/
├── app/
│   ├── page.tsx          # Page principale
│   └── layout.tsx        # Layout avec providers
├── components/
│   ├── ui/               # Composants shadcn
│   ├── LogsPanel.tsx     # Zone de logs
│   ├── RulesEditor.tsx   # Éditeur de règles
│   ├── RegexBuilder.tsx  # Builder visuel
│   ├── LogTemplatesPanel.tsx  # Templates
│   └── ...
├── hooks/
│   └── useUndoRedo.ts    # Hook undo/redo
└── lib/
    ├── anonymizer.ts     # Logique d'anonymisation
    ├── storage.ts        # Persistance localStorage
    └── performance.ts    # Optimisations
```

## 🚀 Déploiement GitHub Pages

Le projet est configuré pour un déploiement automatique sur GitHub Pages.

1. Pushez votre code sur `main` ou `master`
2. Le workflow GitHub Actions build et déploie automatiquement
3. Activez GitHub Pages dans les settings du repo (source: branche `gh-pages`)

## 🔐 Sécurité

- **100% local** - Aucune donnée n'est envoyée à un serveur externe
- **Pas de cookies** - Données stockées uniquement en localStorage
- **Open source** - Code auditable

## 📝 License

MIT

---

<p align="center">
  Fait avec ❤️ pour les développeurs soucieux de la confidentialité
</p>
