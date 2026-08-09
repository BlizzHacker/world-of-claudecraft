// Divergence-only dialect overlay for "fr_CA" over base locale "fr_FR".
//
// "fr_CA" inherits from "fr_FR": the build (scripts/i18n_build.mjs) resolves it as
// nested `en` -> fr_FR overlay -> this overlay, so any key absent here falls through to fr_FR, then to English. This file
// therefore carries ONLY the keys whose value differs from fr_FR; every other key is
// intentionally omitted. A key must NOT be re-added with a value equal to fr_FR
// (redundant duplication). Every key here must be a real `en` leaf
// path (the flat TranslationKey union type + the byte gate). Keys are in `en`'s
// leaf order.

import type { TranslationKey } from '../i18n.catalog';

export const fr_CA: Partial<Record<TranslationKey, string>> = {
  'hud.core.mobileSettings': 'Parametres',
  'hudChrome.account.sectionConnections': 'Comptes connectes',
  'hudChrome.account.connectionsSummary': 'Gerez les fournisseurs de connexion lies a ce compte.',
  'hudChrome.account.ssoLink': 'Lier Discord',
  'hudChrome.account.ssoLinked': 'Discord lie.',
  'hudChrome.account.ssoNotLinked': 'Discord non lie.',
  'hudChrome.account.ssoUnlink': 'Delier Discord',
  'hudChrome.account.ssoLinkConflict': 'Ce compte Discord est deja lie a un autre compte.',
  'hudChrome.account.ssoUnlinkNeedsPassword': 'Definissez un mot de passe avant de delier Discord.',
  'news.officialLog': 'Journal officiel',
  'news.alphaBetaTitle': 'Cadence alpha, beta et royaume public',
  'news.alphaBetaBody':
    'Les testeurs alpha gagnent plus de platine car leurs personnages sont remis a zero toutes les deux semaines. La beta est promue chaque mois apres revue.',
  'news.tokenTitle': '$CR et utilite du platine',
  'news.tokenBody':
    '$CR est le jeton SPL Solana de Cryptic Realm. Le platine relie cosmetiques, maisons, montures, marche et Exchange.',
  'news.prTitle': 'Piste upstream',
  'news.prBody':
    'Les ameliorations generiques du moteur, auth, tableaux de bord et wiki sont partagees avec ClaudeCraft; le propre de Cryptic Realm reste ici.',
  'news.proofTitle': 'Preuve $CR',
  'news.proofBody':
    'La page publique de preuve affiche le mint, la tresorerie et les liens Solscan.',
  'news.openLink': 'Ouvrir',
  'download.linuxCta': 'Telecharger pour Linux',
  'download.linuxHint':
    'AppImage : rendez-le executable, puis lancez-le. Aucune installation requise.',
  'hud.errors.tradeAlreadyTrading': 'Ce joueur est dÃ©jÃ  en train de faire un Ã©change.',
  'guide.professions.craftMasteryBody':
    "Quelques attentes honnÃªtes : la montÃ©e jusqu'au plafond de 125 d'un mÃ©tier demande au moins 125 fabrications rÃ©ussies, chaque fabrication Ã  gain complet vous faisant progresser d'exactement un point, et en pratique un peu plus au fur et Ã  mesure que les recettes s'estompent entre les Ã©chelons du formateur. La fabrication elle-mÃªme est rapide ; c'est l'approvisionnement qui constitue le vrai voyage, alors prÃ©voyez quelques soirÃ©es dÃ©diÃ©es Ã  la rÃ©colte et Ã  l'artisanat par mÃ©tier.\n\nLes mÃ©tiers de rÃ©colte atteignent leur plafond de 100 au fil d'une progression normale si vous rÃ©coltez en voyageant, bien que le dernier tronÃ§on rÃ©clame les noeuds de haut palier du grand nord. La PÃªche est la longue route par conception : selon son propre barÃ¨me de gain, 200 points de maÃ®trise reprÃ©sentent plus de trois mille prises. Grand PÃªcheur est un titre qui se gagne au fil d'une saison de soirÃ©es tranquilles, pas d'une fin de semaine.",
  'download.macCta': 'Telecharger la version macOS',
  'download.windowsPending': 'Version Windows en attente.',
  'nav.whitepaper': 'Livre blanc',
  // Stat tooltips inherit the fr_FR base: none of these strings has a genuine
  // Quebec-specific form, so per the divergence-only policy fr_CA carries no
  // hudChrome.statInfo.* overrides.
  'seo.title': 'Cryptic Realm: MMO Web de style classique',
  'seo.description':
    "Partez Ã  l'aventure dans Cryptic Realm, un micro-MMO de style classique jouable directement dans votre navigateur. Rejoignez un royaume partagÃ©, faites progresser vos classes et terrassez des ennemis.",
  'seo.operatingSystem': 'Navigateur Web',
  'a11y.toggleMenu': 'Ouvrir ou fermer le menu',
  'loading.assetsFailed': 'Le chargement des ressources a Ã©chouÃ©: rechargez la page. {error}',
  'loading.rendererFailed': 'Impossible de dÃ©marrer le rendu: rechargez la page. {error}',
  'loading.enterTimeout':
    "Impossible d'entrer dans le monde. La connexion a expirÃ©. Le serveur de jeu fonctionne-t-il ?",
  'errors.characterNameRequired': 'Entrez un nom de personnage.',
  'errors.characterNameInvalid':
    "Le nom doit compter 2 Ã  16 caractÃ¨res, commencer par une lettre et contenir seulement lettres, espaces, traits d'union ou apostrophes.",
  'errors.selectClass': 'Choisissez une classe.',
  'errors.api.tooManyAttempts': 'Trop de tentatives. Attendez une minute et rÃ©essayez.',
  'errors.api.usernameShape':
    "Le nom d'utilisateur doit compter 3 Ã  24 caractÃ¨res et utiliser lettres, chiffres ou tiret bas.",
  'errors.api.usernameTaken': "Ce nom d'utilisateur est dÃ©jÃ  utilisÃ©.",
  'errors.api.invalidCredentials': "Nom d'utilisateur ou mot de passe invalide.",
  'errors.api.nameTaken': 'Ce nom est dÃ©jÃ  utilisÃ©.',
  'errors.api.deleteConfirm': 'Tapez le nom du personnage pour confirmer la suppression.',
  'realm.onlineNow': '{count} en ligne maintenant',
  'character.inWorld': 'dans le monde',
  'deleteCharacter.body':
    'Cela supprimera dÃ©finitivement {name}. Cette action ne peut pas Ãªtre annulÃ©e.',
  'deleteCharacter.confirmLabel': 'Tapez le nom du personnage pour confirmer',
  'classDetails.sections.startingStats': 'CaractÃ©ristiques de dÃ©part',
  'classDetails.lore.warrior':
    'Les guerriers sont des combattants endurcis qui gagnent de la rage en infligeant ou subissant des dÃ©gÃ¢ts. Ils encaissent ou Ã©crasent leurs ennemis.',
  'classDetails.lore.paladin':
    'Les paladins sont des croisÃ©s sacrÃ©s qui aident par des bÃ©nÃ©dictions, soignent avec la LumiÃ¨re sacrÃ©e et protÃ¨gent les plus faibles.',
  'classDetails.lore.hunter':
    "Les chasseurs sont des spÃ©cialistes Ã  distance qui combattent aux cÃ´tÃ©s d'une bÃªte apprivoisÃ©e, criblant leurs ennemis de tirs prÃ©cis et rapides, les ralentissant de morsures et de traits de choc, et changeant d'aspect selon le moment.",
  'classDetails.lore.shaman':
    'Les chamans commandent les Ã©lÃ©ments, imprÃ¨gnent leurs armes, frappent avec la foudre et restaurent leurs alliÃ©s.',
  'classDetails.lore.mage':
    "Les mages manipulent Feu, Givre et Arcane pour dÃ©truire, conjurer de l'eau et figer les menaces.",
  'classDetails.lore.warlock':
    'Les dÃ©monistes invoquent des dÃ©mons, posent malÃ©dictions et dÃ©gÃ¢ts prolongÃ©s, puis drainent la vie pour survivre.',
  'classDetails.lore.druid':
    'Les druides canalisent la nature, guÃ©rissent, entravent les ennemis et prennent des formes animales pour dÃ©fendre ou attaquer.',
  'classDetails.aria':
    'DÃ©tails de classe pour {className}: rÃ´le {role}. CaractÃ©ristiques de dÃ©part: Force {str}, AgilitÃ© {agi}, Endurance {sta}, Intelligence {int}, Esprit {spi}.',
  'mobilePreflight.rotateTitle': 'Passez en mode paysage',
  'mobilePreflight.baseLandscape':
    "Tournez votre appareil en mode paysage avant d'entrer dans le monde.",
  'mobilePreflight.basePerformance':
    'Les performances mobiles peuvent diminuer. Fermez les onglets inutiles et rÃ©duisez la qualitÃ© de rendu si le jeu ralentit.',
  'mobilePreflight.iosInstallDetail':
    "Pour le vrai plein Ã©cran sur iPhone ou iPad, ajoutez d'abord cette page Ã  l'Ã©cran d'accueil.",
  'mobilePreflight.androidInstallStep':
    "Dans Chrome, touchez le menu, puis Installer l'application ou Ajouter Ã  l'Ã©cran d'accueil.",
  'serverUnavailable.body':
    'Nous redÃ©marrons le service de jeu et Claudemoon devrait revenir sous peu. Cette page continuera de vÃ©rifier automatiquement.',
  'serverUnavailable.status': 'De retour bientÃ´t',
  'delveUi.affix.candleblind': 'Aveuglement de chandelle',
  'delveUi.blessing.chapel_candle':
    "Chandelle de chapelle : parcours plus sÃ»r, une Marque de moins Ã  l'achÃ¨vement.",
  'delveUi.board.enter': "Entrer dans l'excavation",
  'delveUi.board.marks': "Marques d'excavation : {count}",
  'delveUi.board.openDelveAria': 'Ouvrir le tableau des excavations depuis {name}',
  'delveUi.board.title': 'Tableau des excavations',
  'delveUi.boss.varric.bell.emote': 'Le diacre Varric empoigne la cloche enfouie Ã  deux mains!',
  'delveUi.boss.varric.bell.impact': 'Le glas de la cloche fissure le sol de la chambre!',
  'delveUi.boss.varric.bell.lesson':
    "Glas funÃ¨bre : un choc au sol toutes les douze secondes. Ã‰loignez-vous avant l'impact.",
  'delveUi.boss.varric.bell.log': 'Le diacre Varric se met Ã  sonner la cloche funÃ©raire.',
  'delveUi.boss.varric.bell.warning': 'Ã‰loignez-vous du diacre Varric!',
  'delveUi.boss.varric.mid60':
    'Le diacre Varric lit des noms dans le registre avec un triomphe tremblant.',
  'delveUi.boss.varric.pull':
    'Vous foulez la poussiÃ¨re sacrÃ©e avec des intentions impures. Ã€ genoux, et soyez comptÃ©.',
  'delveUi.boss.varric.raise.emote': 'Le diacre Varric appelle des noms des tombes brisÃ©es!',
  'delveUi.boss.varric.raise.interrupt_fail': "Les morts rÃ©pondent Ã  l'appel du diacre Varric!",
  'delveUi.boss.varric.raise.interrupt_ok': 'Le rite funÃ¨bre vacille.',
  'delveUi.boss.varric.raise.lesson':
    'Interrompez la tombe fissurÃ©e en cinq secondes, sinon les morts se lÃ¨vent Ã  son appel.',
  'delveUi.boss.varric.raise.log': 'Le diacre Varric entame Relever les morts.',
  'delveUi.boss.varric.raise.object': "La tombe fissurÃ©e frÃ©mit d'un souffle volÃ©.",
  'delveUi.boss.varric.raise.warning': 'ArrÃªtez le rite funÃ¨bre!',
  'delveUi.chest.flavor': "Les morts ont cÃ©dÃ© ce qu'ils pouvaient Ã©pargner.",
  'delveUi.companion.tessa.combat_start':
    "Garde l'Ã©quilibre, {playerName}. Les morts sont agitÃ©s ici.",
  'delveUi.companion.tessa.low_hp': 'Respire. Il me reste des priÃ¨res pour toi.',
  'delveUi.companion.tessa.rank.1': 'Novice de chapelle',
  'delveUi.companion.tessa.rank.4': "TÃ©moin de l'appel des tombes",
  'delveUi.companion.tessa.rank.5': 'Gardienne de chapelle',
  'delveUi.companion.tessa.trap_spotted': 'Attends, quelque chose dans le sol se souvient des pas.',
  'delveUi.death.warning': 'Une mort de plus mettra fin Ã  cette excavation.',
  'delveUi.intro.heroic':
    "Les portes se referment en grinÃ§ant derriÃ¨re vous. Des noms raclent la pierre comme des ongles. La chandelle de Tessa brÃ»le bleu. Â« Ils n'appellent plus les morts, maintenant, {playerName}. Ils rÃ©pondent Ã  quelque chose. Â»",
  'delveUi.intro.normal':
    "L'escalier est froid et sombre. Des pierres de saints brisÃ©es jonchent la descente, et une douce note de cloche flotte dans l'air humide. L'acolyte Tessa murmure : Â« Le reliquaire ne devrait pas Ãªtre ouvert aussi profondÃ©ment. Reste prÃ¨s de moi, {playerName}. Â»",
  'delveUi.lore.bell_below':
    'Note en marge de Tessa : Â« Il y a une seconde cloche sous le reliquaire. Elle sonne pour les Ã©garÃ©s, pas pour les morts. Â»',
  'delveUi.lore.eastbrook_ledger':
    "Une page tachÃ©e d'eau du registre funÃ©raire d'Eastbrook. Des noms biffÃ©s et rÃ©Ã©crits d'une main qui n'est pas humaine.",
  'delveUi.lore.first_collapse':
    'Les archives de la chapelle relatent le premier affaissement : pierres de saints fendues, Ã©tagÃ¨res inclinÃ©es, et une note de cloche entendue depuis le sous-sol.',
  'delveUi.lore.gravecaller_mark':
    "Un sigil gravÃ© dans le bois d'un cercueil, non pas le sceau de Morthen, mais une marque d'appel des tombes plus ancienne, antÃ©rieure Ã  la Crypte creuse.",
  'delveUi.lore.tessa_note':
    "Bout de papier pliÃ© de l'Ã©criture de Tessa : Â« Si les registres changent pendant que nous sommes en bas, fie-toi Ã  la chandelle, pas aux voix. Â»",
  'delveUi.module.reliquary_bell_niche':
    "Des dizaines de clochettes pendent en silence, chacune nouÃ©e d'un linge funÃ©raire.",
  'delveUi.module.reliquary_finale': 'La cloche enfouie sonne une seule fois sous vos bottes.',
  'delveUi.module.reliquary_saintless_hall':
    'Des statues dont les visages ont Ã©tÃ© burinÃ©s avec une haine mÃ©ticuleuse.',
  'delveUi.module.reliquary_sunken_ossuary':
    "L'eau suinte Ã  travers les Ã©tagÃ¨res funÃ©raires, charriant de vieilles cendres en filets argent et noir.",
  'delveUi.npc.halven.greeting':
    "Le reliquaire en bas s'est encore dÃ©placÃ©. Nous entendons des litanies Ã  travers le plancher aprÃ¨s minuit, et l'acolyte Tessa jure que les registres funÃ©raires changent leur propre encre. Si tu as assez de courage, {playerName}, prends une chandelle et descends. Ne te fie pas Ã  toutes les voix que tu entendras lÃ -bas. Certaines connaissaient ton nom avant ta naissance.",
  'delveUi.run.failed': "L'excavation a Ã©chouÃ©. Vous Ãªtes ramenÃ© auprÃ¨s du frÃ¨re Halven.",
  'delveUi.summary.marks': "{count} Marques d'excavation gagnÃ©es",
  'delveUi.summary.title': 'Excavation terminÃ©e',
  'delveUi.tracker.marks': "Marques d'excavation : {count}",
  'delveUi.tracker.title': 'Excavation',
  'entities.abilities.blazing_barrier.name': 'Bouclier ardent',
  'entities.abilities.blazing_barrier.description':
    'Entoure-toi de feu et absorbe {damage} points de dÃ©gÃ¢ts pendant 60 s. (Feu)',
  'entities.abilities.cold_snap.name': 'Rappel hivernal',
  'entities.abilities.cold_snap.description':
    'RÃ©initialise la recharge de Pas scintillant, Voile de givre et InvisibilitÃ© accrue. (Talent de mage)',
  'entities.abilities.greater_invisibility.name': 'InvisibilitÃ© accrue',
  'entities.abilities.greater_invisibility.description':
    'Disparais pendant 20 s : enlÃ¨ve 2 effets de dÃ©gÃ¢ts pÃ©riodiques et rÃ©duit de 90% les dÃ©gÃ¢ts que tu subis tant que tu es invisible et pour un court moment aprÃ¨s. (Talent de mage)',
  'entities.abilities.hot_streak.name': 'Suite flamboyante',
  'entities.abilities.hot_streak.description':
    "Passif : deux coups critiques de suite avec tes sorts de Feu (Boule de feu, Trait de feu, BrÃ»lure, Explosion pyrotechnique ou Choc de flammes) rendent ta prochaine Explosion pyrotechnique ou ton prochain Choc de flammes instantanÃ© et gratuit. Les sorts qui dÃ©pensent cet effet comptent pour la suite SUIVANTE, mÃªme les incantations gratuites; Choc de flammes ne compte qu'une fois, peu importe le nombre d'ennemis touchÃ©s, et seul le premier impact peut compter. (Feu)",
  'entities.abilities.ice_floes.name': 'Glaces flottantes',
  'entities.abilities.ice_floes.description':
    "Tes deux prochains sorts qui ont un temps d'incantation peuvent Ãªtre lancÃ©s en mouvement. Dure 15 s. (Talent de mage)",
  'entities.abilities.ignition.description':
    'Passif : les coups critiques de tes sorts enflamment la cible et lui infligent 40% des dÃ©gÃ¢ts causÃ©s sur 6 s; cet effet se cumule. (MaÃ®trise du Feu)',
  'entities.abilities.mass_barrier.name': 'Bouclier collectif',
  'entities.abilities.mass_barrier.description':
    'Pose un bouclier sur toi et sur un maximum de 4 alliÃ©s proches dans un rayon de 30 m; chacun absorbe 130 points de dÃ©gÃ¢ts pendant 60 s. (Talent de mage)',
  'entities.abilities.overload.name': 'Surpuissance',
  'entities.abilities.overload.description':
    'Ton prochain sort gagne 40% de puissance, mais coÃ»te 50% de mana de plus. Dure 10 s. (Talent de mage)',
  'entities.abilities.power_echo.name': 'Ã‰cho de pouvoir',
  'entities.abilities.power_echo.description':
    'Ton prochain sort direct se produit de nouveau Ã  50% de sa puissance sur la mÃªme cible. Dure 10 s. (Talent de mage)',
  'entities.abilities.rings_of_frost.name': 'Cercle de givre',
  'entities.abilities.rings_of_frost.description':
    'Fait apparaÃ®tre un cercle pendant 10 s. Les ennemis qui traversent son contour sont gelÃ©s pendant 4 s. (Talent de mage)',
  'entities.abilities.rune_of_power.name': 'Rune de pouvoir',
  'entities.abilities.rune_of_power.description':
    'Trace une rune de pouvoir sous tes pieds pendant 15 s : les alliÃ©s qui restent Ã  moins de 8 m infligent 10% plus de dÃ©gÃ¢ts. (Talent de mage)',
  'entities.abilities.summon_water_elemental.name': "Invoquer un Ã©lÃ©mentaire d'eau",
  'entities.abilities.summon_water_elemental.description':
    "Invoque un Ã©lÃ©mentaire d'eau qui se bat Ã  tes cÃ´tÃ©s, lance des Ã‰clairs d'eau sur ta cible et canalise Jet d'eau. (Givre)",
  'entities.items.conjured_water4.name': 'Eau de source conjurÃ©e',
  'entities.items.conjured_bread4.name': 'Miche de festin conjurÃ©e',
  'entities.mobs.reliquary_gravecall_acolyte.name': "Acolyte de l'appel des tombes",
  'entities.mobs.water_elemental.name': 'Ã‰lÃ©mentaire des eaux',
  'entities.npcs.brother_halven.greeting': "Le reliquaire en bas s'est encore dÃ©placÃ©.",
  'sim.delve.alreadyInDelve': 'Vous Ãªtes dÃ©jÃ  dans une excavation.',
  'sim.delve.bossChest':
    "Le boss tombe. Un coffre de reliquaire scellÃ© s'Ã©lÃ¨ve sur l'estrade : crochetez sa serrure pour rÃ©clamer votre butin.",
  'sim.delve.cannotAffordCompanionUpgrade':
    "Vous n'avez pas les moyens de payer cette amÃ©lioration.",
  'sim.delve.cannotEnterNow': "Vous ne pouvez pas entrer dans une excavation pour l'instant.",
  'sim.delve.companionMarksRequired':
    "Il vous faut {marks} Marques d'excavation pour amÃ©liorer {name}.",
  'sim.delve.companionMaxRank': 'Ce compagnon est dÃ©jÃ  pleinement amÃ©liorÃ©.',
  'sim.delve.complete': '{name} terminÃ©.',
  'sim.delve.duringArena':
    "Vous ne pouvez pas entrer dans une excavation pendant un match d'arÃ¨ne.",
  'sim.delve.duringDuel': 'Vous ne pouvez pas entrer dans une excavation pendant un duel.',
  'sim.delve.graveFalters': 'Le rite funÃ¨bre vacille.',
  'sim.delve.mechanismOpen':
    "Un mÃ©canisme s'ouvre dans un dÃ©clic tout prÃ¨s. Un passage s'ouvre vers le nord : trouvez le portail de sortie devant vous.",
  'sim.delve.notInDelve': "Vous n'Ãªtes pas dans une excavation.",
  'sim.delve.nothingHappens': 'Rien ne se passe.',
  'sim.delve.raiseDead': '{name} entame Relever les morts.',
  'sim.delve.runFailed': "L'excavation {name} a Ã©chouÃ©.",
  'sim.delve.strikeWall': 'Frappez le mur pour percer.',
  'sim.delve.surfaceStairs':
    "Un escalier vers la surface s'ouvre. Appuyez sur F Ã  l'escalier pour partir.",
  'sim.delve.tombstoneHint':
    "Un passage de pierre tombale s'ouvre vers le nord une fois la salle nettoyÃ©e.",
  'sim.delve.tombstoneInto': 'Vous franchissez la pierre tombale vers {name}.',
  'sim.delve.tombstoneOpen':
    "Un passage de pierre tombale scellÃ© s'ouvre en grinÃ§ant vers le nord. Avancez dedans pour continuer.",
  'sim.delve.unknownTier': "Palier d'excavation inconnu.",
  'sim.delve.whileTrading': 'Vous ne pouvez pas entrer dans une excavation pendant un Ã©change.',
  'sim.lockpick.lastPickSnaps':
    "Le dernier crochet se brise. La serrure se bloque : le coffre est perdu Ã  moins de terminer l'excavation de nouveau.",
  'sim.lockpick.lockJammed':
    "La serrure est bloquÃ©e, impossible Ã  crocheter : terminez l'excavation de nouveau pour une autre tentative.",
  'sim.lockpick.lockYields': 'La serrure cÃ¨de! Butin {tier}.',
  // Mobile touch controls: the hotbar page-flip button and its accessible name.
  'hudChrome.mobile.hotbarPageAria': 'Afficher la prochaine sÃ©rie de techniques',
  // Aura effect tooltip summaries.
  'hudChrome.auraEffect.dot': 'Cause {value} points de dÃ©gÃ¢ts de {school} toutes les {interval} s',
  'hudChrome.auraEffect.hot': 'Redonne {value} points de vie toutes les {interval} s',
  'hudChrome.auraEffect.absorb': 'Bloque {value} points de dÃ©gÃ¢ts',
  'hudChrome.auraEffect.healAbsorb': 'Bloque {value} points de soins reÃ§us',
  'hudChrome.auraEffect.thorns': 'Cause {value} points de dÃ©gÃ¢ts de {school} aux attaquants',
  'hudChrome.auraEffect.slow': 'Diminue la vitesse de dÃ©placement de {pct}%',
  'hudChrome.auraEffect.speed': 'AccroÃ®t la vitesse de dÃ©placement de {pct}%',
  'hudChrome.auraEffect.attackSpeedSlow': "Diminue la vitesse d'attaque de {pct}%",
  'hudChrome.auraEffect.attackSpeedFast': "AccroÃ®t la vitesse d'attaque de {pct}%",
  'hudChrome.auraEffect.haste': "AccroÃ®t la vitesse d'attaque et d'incantation de {pct}%",
  'hudChrome.auraEffect.tongues': "AccroÃ®t le temps d'incantation de {pct}%",
  'hudChrome.auraEffect.increase.ap': "AccroÃ®t la puissance d'attaque de {value}",
  'hudChrome.auraEffect.increase.armor': "AccroÃ®t l'armure de {value}",
  'hudChrome.auraEffect.increase.int': "AccroÃ®t l'intelligence de {value}",
  'hudChrome.auraEffect.increase.agi': "AccroÃ®t l'agilitÃ© de {value}",
  'hudChrome.auraEffect.increase.sta': "AccroÃ®t l'endurance de {value}",
  'hudChrome.auraEffect.increase.spi': "AccroÃ®t l'esprit de {value}",
  'hudChrome.auraEffect.increase.allStats': 'AccroÃ®t tous les attributs de {value}',
  'hudChrome.auraEffect.reduce.ap': "Diminue la puissance d'attaque de {value}",
  'hudChrome.auraEffect.reduce.armor': "Diminue l'armure de {value}",
  'hudChrome.auraEffect.reduce.int': "Diminue l'intelligence de {value}",
  'hudChrome.auraEffect.reduce.agi': "Diminue l'agilitÃ© de {value}",
  'hudChrome.auraEffect.reduce.sta': "Diminue l'endurance de {value}",
  'hudChrome.auraEffect.reduce.spi': "Diminue l'esprit de {value}",
  'hudChrome.auraEffect.reduce.allStats': 'Diminue tous les attributs de {value}',
  'hudChrome.auraEffect.dodge': "AccroÃ®t les chances d'esquive de {pct}%",
  'hudChrome.auraEffect.dodgeReduce': "Diminue les chances d'esquive de {pct}%",
  'hudChrome.auraEffect.armorFlat': "Diminue l'armure de {value}",
  'hudChrome.auraEffect.armorFlatStacks': "Diminue l'armure de {value} ({stacks} charges)",
  'hudChrome.auraEffect.mortalWound': 'Diminue les soins reÃ§us de {pct}%',
  'hudChrome.auraEffect.vulnerability': 'AccroÃ®t les dÃ©gÃ¢ts subis de {pct}%',
  'hudChrome.auraEffect.physVuln': 'AccroÃ®t les dÃ©gÃ¢ts physiques subis de {pct}%',
  'hudChrome.auraEffect.spellVuln': 'AccroÃ®t les dÃ©gÃ¢ts magiques subis de {pct}%',
  'hudChrome.auraEffect.critVuln': 'AccroÃ®t les chances de subir un coup critique de {pct}%',
  'hudChrome.auraEffect.costTax': 'AccroÃ®t le coÃ»t des techniques de {pct}%',
  'hudChrome.auraEffect.stun': "SonnÃ© : impossible d'agir",
  'hudChrome.auraEffect.root': 'ImmobilisÃ© : impossible de bouger',
  'hudChrome.auraEffect.incapacitate': "NeutralisÃ©, impossible d'agir",
  'hudChrome.auraEffect.polymorph': "TransformÃ© : impossible d'agir",
  'hudChrome.auraEffect.hex': 'Diminue les dÃ©gÃ¢ts et soins prodiguÃ©s de {pct}%',
  'hudChrome.auraEffect.blind': "AveuglÃ©, impossible d'agir",
  'hudChrome.auraEffect.silence': 'Diminue au silence : impossible de lancer des sorts',
  'hudChrome.auraEffect.disarm': "DÃ©sarmÃ©, impossible d'utiliser des attaques d'arme",
  'hudChrome.auraEffect.lockout': 'Ã‰cole de magie verrouillÃ©e',
  'hudChrome.auraEffect.imbue': 'Arme enchantÃ©e avec effets bonus',
  'hudChrome.auraEffect.imbueRange': 'Arme enchantÃ©e : {min} Ã  {max} dÃ©gÃ¢ts bonus au jugement',
  'hudChrome.auraEffect.stealth': 'DissimulÃ© ; vitesse de dÃ©placement rÃ©duite de {pct}%',
  'hudChrome.auraEffect.formBear': 'Forme ours : points de vie et armure augmentÃ©s',
  'hudChrome.auraEffect.formCat': 'Forme fÃ©line : dÃ©gÃ¢ts de mÃªlÃ©e et Ã©nergie',
  'hudChrome.auraEffect.formTravel': 'Forme voyage : vitesse de dÃ©placement augmentÃ©e de {pct}%',
  'hudChrome.auraEffect.defensiveStance': 'Posture dÃ©fensive, dÃ©gÃ¢ts subis rÃ©duits, menace accrue',
  'hudChrome.auraEffect.righteousFury':
    'Fureur vertueuse, menace des dÃ©gÃ¢ts SacrÃ© fortement accrue',
  'hudChrome.auraEffect.scale': 'Gabarit augmentÃ©e de {pct}%',
  'hudChrome.auraEffect.jump': 'Saut augmentÃ©e de {pct}%',
  'hudChrome.auraEffect.school.physical': 'physique',
  'hudChrome.auraEffect.school.fire': 'feu',
  'hudChrome.auraEffect.school.frost': 'froid',
  'hudChrome.auraEffect.school.arcane': 'arcane',
  'hudChrome.auraEffect.school.shadow': 'ombre',
  'hudChrome.auraEffect.school.holy': 'sacrÃ©',
  'hudChrome.auraEffect.school.nature': 'nature',
  'auth.email': 'Courriel de recuperation',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.emailError': 'Entre une adresse courriel valide.',
  'auth.ssoMoveweight': 'Connexion avec MoveWeight',
  'auth.ssoProviders': 'Continuer avec Google, Facebook, Plex ou Discord',
  'auth.ssoButton': 'Continuer avec Google, Facebook ou Plex',
  'auth.ladderChar': 'Personnage de saison',
  'auth.ladderHint':
    'Participe au classement saisonnier. A la fin de la saison, il devient un personnage standard et conserve sa progression.',
  'auth.hardcoreChar': 'Personnage hardcore',
  'auth.hardcoreHint':
    'Mort permanente. Si ce personnage meurt, il est retire definitivement et ne peut plus etre joue. Pas de resurrection.',
  'auth.recovery.title': 'Ajouter un courriel de recuperation',
  'auth.recovery.body':
    'Definis une adresse courriel afin de pouvoir recuperer ton compte. Nous l utilisons seulement pour confirmer que ce compte t appartient si tu dois reinitialiser ton mot de passe.',
  'auth.recovery.save': 'Enregistrer le courriel',
  'auth.recovery.logOut': 'Se deconnecter',
  'auth.recovery.invalid': 'Entre une adresse courriel valide.',
  'auth.recovery.failed': 'Impossible d enregistrer ton courriel. Reessaie.',
  'guide.deedsPage.cat.delve': 'Excavations',
  'hudChrome.deeds.catDelve': 'Excavations',
  'hudChrome.auraEffect.battleStance': 'Posture de combat : gÃ©nÃ©ration de rage accrue de 10%',
  'hudChrome.auraEffect.berserkerStance':
    'Posture de berserker : coups critiques 3% plus frÃ©quents et 3% plus puissants',
  'hudChrome.auraEffect.crit': 'AccroÃ®t les chances de coup critique de {pct}%',
  'hudChrome.auraEffect.rageGen': 'AccroÃ®t la gÃ©nÃ©ration de rage de {pct}%',
  'hudChrome.auraEffect.reckless':
    'AccroÃ®t les chances de coup critique de {pct}% et la gÃ©nÃ©ration de rage de {ragePct}%',
  'hudChrome.auraEffect.avatar': 'Colosse : dÃ©gÃ¢ts infligÃ©s accrus de {pct}%',
  'hudChrome.auraEffect.bloodbath':
    'AccroÃ®t les chances de coup critique et les dÃ©gÃ¢ts infligÃ©s de {pct}%',
  'hudChrome.auraEffect.dieBySword': 'Diminue les dÃ©gÃ¢ts subis de {pct}%',
  'hudChrome.auraEffect.victoryRush': 'Ã‰lan de victoire est prÃªt',
  'hudChrome.auraEffect.maxHpPct': 'AccroÃ®t les points de vie maximum de {pct}%',
  'hudChrome.statInfo.desc.parry':
    'Vos chances de parer entiÃ¨rement une attaque de mÃªlÃ©e de front, sans subir de dÃ©gÃ¢ts. Un coup portÃ© dans le dos ne peut pas Ãªtre parÃ©.',
  'hudChrome.interfaceTabs.chat': 'Clavardage',
  'hudChrome.options.mouseoverCast': 'Lancement au survol sur les cadres de groupe',
  'hud.errors.marketListBound': 'Cet objet est liÃ© et ne peut pas Ãªtre inscrit au marchÃ©.',
  'hudChrome.mailbox.result.noMailBound':
    'Cet objet est liÃ© et ne peut pas Ãªtre envoyÃ© par la poste.',
  'hud.prompts.guildInviteCancelled':
    'Une invitation de guilde en attente a Ã©tÃ© annulÃ©e parce que la guilde a Ã©tÃ© renommÃ©e.',
  'hud.prompts.guildRenamed': "Votre guilde a Ã©tÃ© renommÃ©e en {name} par l'Ã©quipe de modÃ©ration.",
};
