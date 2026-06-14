import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding TCF Canada — épreuves complètes...');

  // Vider les questions existantes pour repartir propre
  await prisma.question.deleteMany({});

  await prisma.question.createMany({
    data: [

      // ═══════════════════════════════════════════════════════════
      // CO — COMPRÉHENSION DE L'ORAL (12 questions avec transcript)
      // ═══════════════════════════════════════════════════════════

      {
        section: 'CO', level: 'A2', theme: 'transport',
        timeLimitMin: 1,
        transcript: "Attention voyageurs. Le train numéro 847 à destination de Québec partira avec vingt minutes de retard. Nouveau départ prévu à quinze heures quarante-cinq. Nous vous prions de nous excuser pour ce désagrément.",
        question: "Vous entendez cette annonce dans une gare. Pourquoi le train est-il en retard ?",
        options: { a: "L'annonce ne donne pas la raison", b: "À cause des travaux sur la voie", c: "Un problème de billet", d: "La gare est fermée" },
        answer: 'a',
        explanation: "L'annonce mentionne seulement le retard et les excuses, sans expliquer la cause.",
      },
      {
        section: 'CO', level: 'A2', theme: 'quotidien',
        timeLimitMin: 1,
        transcript: "Bonjour, vous êtes bien chez le cabinet du docteur Martin. Nos horaires d'ouverture sont du lundi au vendredi, de huit heures à dix-huit heures. Pour une urgence, composez le 811. Pour laisser un message ou prendre rendez-vous, restez en ligne.",
        question: "Vous entendez ce message sur un répondeur. Que devez-vous faire pour prendre rendez-vous ?",
        options: { a: "Rappeler le 811", b: "Rester en ligne", c: "Appeler le mardi uniquement", d: "Envoyer un email" },
        answer: 'b',
        explanation: "Le message précise : « Pour laisser un message ou prendre rendez-vous, restez en ligne ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'immigration',
        timeLimitMin: 2,
        transcript: "Bonjour, je voudrais des informations sur le processus d'immigration au Canada. Bien sûr ! Il existe plusieurs programmes. Le plus courant est Entrée express, qui évalue votre profil selon vos compétences linguistiques, votre expérience de travail et votre niveau d'études. Vous aurez besoin d'un test de français comme le TCF Canada. Quel est le niveau minimum requis ? En général, un niveau B2 pour la plupart des programmes, mais ça dépend du programme choisi.",
        question: "Selon ce dialogue, quel document est nécessaire pour immigrer via Entrée express ?",
        options: { a: "Un diplôme universitaire", b: "Un test de langue française", c: "Un contrat de travail canadien", d: "Une lettre de recommandation" },
        answer: 'b',
        explanation: "L'agent mentionne clairement « vous aurez besoin d'un test de français comme le TCF Canada ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'logement',
        timeLimitMin: 2,
        transcript: "Radio Montréal, il est dix-huit heures. Le marché immobilier québécois connaît une hausse significative des loyers cette année. À Montréal, le prix moyen d'un appartement d'une chambre a augmenté de douze pour cent par rapport à l'année dernière. Les experts conseillent aux nouveaux arrivants de s'inscrire rapidement dans les registres de logements sociaux pour bénéficier de loyers abordables.",
        question: "Que conseillent les experts aux nouveaux arrivants ?",
        options: { a: "D'acheter un appartement rapidement", b: "De chercher en banlieue uniquement", c: "De s'inscrire dans les registres de logements sociaux", d: "D'attendre que les prix baissent" },
        answer: 'c',
        explanation: "Les experts recommandent de « s'inscrire rapidement dans les registres de logements sociaux ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'travail',
        timeLimitMin: 2,
        transcript: "Allô, bonjour. Je vous appelle suite à votre candidature pour le poste de technicien. Votre profil nous a intéressés. Est-ce que vous seriez disponible pour un entretien jeudi prochain, à quatorze heures ? Vous pouvez également nous appeler au zéro cinq cent trente-deux pour confirmer. Bonne journée.",
        question: "Quel est l'objet de ce message téléphonique ?",
        options: { a: "Proposer un emploi immédiatement", b: "Inviter à un entretien d'embauche", c: "Demander des documents supplémentaires", d: "Confirmer un rendez-vous déjà fixé" },
        answer: 'b',
        explanation: "L'appelant propose un entretien jeudi prochain suite à la candidature.",
      },
      {
        section: 'CO', level: 'B2', theme: 'société',
        timeLimitMin: 3,
        transcript: "Dans notre société multiculturelle, l'intégration des immigrants est un défi collectif. Une étude récente de l'Université de Montréal montre que les immigrants qui maîtrisent le français trouvent un emploi qualifié deux fois plus rapidement que ceux qui ne le parlent pas. Cependant, les chercheurs soulignent que la langue seule ne suffit pas : la reconnaissance des diplômes étrangers reste un obstacle majeur pour de nombreux professionnels immigrants, notamment dans les domaines de la santé et du génie.",
        question: "Selon cette émission, quel est le principal obstacle à l'emploi qualifié des immigrants, outre la langue ?",
        options: { a: "Le manque d'expérience canadienne", b: "La non-reconnaissance des diplômes étrangers", c: "La discrimination dans les entreprises", d: "L'absence de réseau professionnel" },
        answer: 'b',
        explanation: "Les chercheurs soulignent que « la reconnaissance des diplômes étrangers reste un obstacle majeur ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'éducation',
        timeLimitMin: 3,
        transcript: "L'Université Laval accueille chaque année plus de cinq mille étudiants internationaux. Pour s'inscrire, vous devez fournir une preuve de votre niveau de français — un résultat TCF ou DELF — ainsi que vos relevés de notes officiels traduits et authentifiés. Les droits de scolarité pour les étudiants internationaux hors entente sont d'environ vingt-deux mille dollars par an. Des bourses d'excellence sont disponibles pour les meilleurs dossiers.",
        question: "Combien coûtent approximativement les frais de scolarité annuels pour un étudiant international sans entente ?",
        options: { a: "5 000 dollars", b: "15 000 dollars", c: "22 000 dollars", d: "35 000 dollars" },
        answer: 'c',
        explanation: "Le texte précise « environ vingt-deux mille dollars par an » pour les étudiants internationaux hors entente.",
      },
      {
        section: 'CO', level: 'B2', theme: 'santé',
        timeLimitMin: 3,
        transcript: "Bienvenue au CLSC de Rosemont. Pour les urgences médicales, rendez-vous aux urgences de l'Hôpital Maisonneuve-Rosemont. Pour un rendez-vous avec un médecin de famille, vous pouvez vous inscrire sur le portail Rendez-vous santé Québec. Les nouveaux arrivants bénéficient de la RAMQ — la Régie de l'assurance maladie du Québec — après un délai de carence de trois mois. En attendant, nous vous conseillons de souscrire à une assurance privée temporaire.",
        question: "Quel délai un nouvel arrivant doit-il attendre avant de bénéficier de la RAMQ ?",
        options: { a: "1 mois", b: "3 mois", c: "6 mois", d: "1 an" },
        answer: 'b',
        explanation: "Le message mentionne « après un délai de carence de trois mois ».",
      },
      {
        section: 'CO', level: 'A2', theme: 'météo',
        timeLimitMin: 1,
        transcript: "Bonjour et bienvenue à Montréal ! Ce matin il fait moins huit degrés, avec du vent. Couvrez-vous bien ! Cet après-midi, les températures remonteront à moins deux. Pour le week-end, on attend de la neige — environ vingt centimètres.",
        question: "Quel temps est prévu pour le week-end ?",
        options: { a: "Du soleil et du vent", b: "De la pluie", c: "De la neige", d: "Du brouillard" },
        answer: 'c',
        explanation: "Le bulletin annonce « de la neige — environ vingt centimètres » pour le week-end.",
      },
      {
        section: 'CO', level: 'A2', theme: 'quotidien',
        timeLimitMin: 1,
        transcript: "Bonjour ! Je voudrais commander un café allongé et un croissant, s'il vous plaît. Bien sûr. Vous mangez sur place ou à emporter ? À emporter. D'accord. Ça fait trois dollars cinquante. Vous payez comment ? Par carte, s'il vous plaît.",
        question: "Comment le client paie-t-il sa commande ?",
        options: { a: "En espèces", b: "Par carte bancaire", c: "Par application mobile", d: "Il ne paie pas encore" },
        answer: 'b',
        explanation: "Le client répond « par carte, s'il vous plaît ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'francophonie',
        timeLimitMin: 2,
        transcript: "La loi 101, aussi connue sous le nom de Charte de la langue française, fait du français la langue officielle du Québec depuis 1977. Elle oblige notamment les entreprises de cinquante employés et plus à fonctionner en français. Elle garantit aussi le droit à l'éducation en français pour tous les enfants. Certains critiques estiment qu'elle freine l'anglicisation, tandis que d'autres y voient une atteinte aux droits des anglophones.",
        question: "Depuis quelle année la loi 101 est-elle en vigueur au Québec ?",
        options: { a: "1960", b: "1977", c: "1990", d: "2000" },
        answer: 'b',
        explanation: "Le texte précise « depuis 1977 ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'économie',
        timeLimitMin: 3,
        transcript: "Le Québec souffre actuellement d'une pénurie de main-d'œuvre dans plusieurs secteurs clés : la restauration, la construction, les soins infirmiers et les technologies de l'information. Pour y remédier, le gouvernement a simplifié certaines procédures d'immigration et lancé le Programme des travailleurs étrangers temporaires. Les employeurs peuvent désormais faire venir des travailleurs qualifiés en moins de six mois, contre dix-huit mois auparavant.",
        question: "Comment le gouvernement a-t-il répondu à la pénurie de main-d'œuvre ?",
        options: { a: "En augmentant les salaires", b: "En formant davantage de Québécois", c: "En simplifiant les procédures d'immigration", d: "En fermant des entreprises non essentielles" },
        answer: 'c',
        explanation: "Le gouvernement a « simplifié certaines procédures d'immigration » et lancé un programme dédié.",
      },

      // ═══════════════════════════════════════════════════════════
      // CE — COMPRÉHENSION DES ÉCRITS (12 questions)
      // ═══════════════════════════════════════════════════════════

      {
        section: 'CE', level: 'A2', theme: 'logement',
        question: "Lisez cette annonce : « À LOUER — Appartement 3½ au centre-ville de Montréal. 2e étage, sans ascenseur. Chauffage et eau chaude inclus. Stationnement en sus. 1 200 $/mois. Disponible le 1er juillet. Non-fumeurs. Pas d'animaux. Contact : Marie au 514-555-0123 »\n\nQu'est-ce qui est INCLUS dans le loyer ?",
        options: { a: "Le stationnement", b: "Le chauffage et l'eau chaude", c: "Internet et câble", d: "L'électricité" },
        answer: 'b',
        explanation: "L'annonce précise « Chauffage et eau chaude inclus ». Le stationnement est « en sus » (en plus).",
      },
      {
        section: 'CE', level: 'A2', theme: 'formation',
        question: "Lisez cette publicité : « COURS DE FRANÇAIS GRATUITS pour nouveaux arrivants. Niveaux A1 à B1. Horaires flexibles : matin, après-midi ou soir. Inscription en ligne sur notre site. Places limitées — première arrivée, première servie ! Centre communautaire La Boussole, 45 rue Beaubien, Montréal. »\n\nPour qui ces cours sont-ils destinés ?",
        options: { a: "À tous les adultes francophones", b: "Aux étudiants universitaires", c: "Aux nouveaux arrivants", d: "Aux enfants de 6 à 12 ans" },
        answer: 'c',
        explanation: "La publicité précise « pour nouveaux arrivants ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'immigration',
        question: "Lisez cet extrait : « Pour obtenir votre certificat de sélection du Québec (CSQ), vous devez soumettre une demande complète comprenant : votre formulaire rempli, une copie de votre passeport valide, les résultats de votre test de langue (TCF Canada ou TEF Canada), vos diplômes et relevés de notes traduits, ainsi que les frais de traitement de 822 dollars. Le délai de traitement est actuellement de 18 à 24 mois. »\n\nQuel est l'un des documents requis pour obtenir le CSQ ?",
        options: { a: "Un billet d'avion aller-retour", b: "Une offre d'emploi du Québec", c: "Les résultats d'un test de langue", d: "Un extrait de casier judiciaire" },
        answer: 'c',
        explanation: "Le texte liste « les résultats de votre test de langue (TCF Canada ou TEF Canada) » parmi les documents requis.",
      },
      {
        section: 'CE', level: 'B1', theme: 'travail',
        question: "Lisez cette offre d'emploi : « TECHNICIEN(NE) EN INFORMATIQUE — Entreprise : TechMontréal Inc. Poste permanent, temps plein. Salaire : 55 000 $ à 65 000 $/an selon expérience. Exigences : DEC en informatique ou équivalent, 2 ans d'expérience, bilinguisme français-anglais (un atout). Avantages : assurances collectives, 3 semaines de vacances, télétravail 2 jours/semaine. Entrée en poste : immédiatement. »\n\nLe bilinguisme est-il obligatoire pour ce poste ?",
        options: { a: "Oui, c'est une exigence absolue", b: "Non, c'est un atout apprécié", c: "Seulement pour les réunions", d: "L'annonce ne le mentionne pas" },
        answer: 'b',
        explanation: "L'annonce précise « bilinguisme français-anglais (un atout) » — un atout n'est pas une obligation.",
      },
      {
        section: 'CE', level: 'B1', theme: 'culture',
        question: "Lisez ce programme : « FESTIVAL DES CULTURES DU MONDE — Samedi 15 juillet, de 10h à 22h. Parc Jarry, Montréal. Au programme : spectacles de danse, concerts, expositions artisanales, initiation aux langues du monde, cuisine internationale. Entrée gratuite. Navette gratuite depuis la station de métro De Castelnau toutes les 30 minutes. »\n\nComment les visiteurs peuvent-ils se rendre au festival sans voiture ?",
        options: { a: "En taxi gratuit", b: "En navette depuis une station de métro", c: "À pied uniquement depuis le centre-ville", d: "Il n'y a pas d'option de transport" },
        answer: 'b',
        explanation: "Le programme propose « une navette gratuite depuis la station de métro De Castelnau toutes les 30 minutes ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'société',
        question: "Lisez cet article : « La « fatigue de compassion » est un phénomène de plus en plus documenté chez les travailleurs du secteur social. Ces professionnels, exposés quotidiennement à la détresse humaine, développent des symptômes similaires au burn-out : épuisement émotionnel, dépersonnalisation et sentiment d'inefficacité. Les experts recommandent des mesures préventives institutionnelles, notamment la supervision clinique obligatoire et la réduction de la charge de travail, plutôt que de laisser la responsabilité aux individus seuls. »\n\nQuelle approche les experts recommandent-ils pour prévenir la fatigue de compassion ?",
        options: { a: "Que chaque travailleur gère sa propre santé mentale", b: "Des mesures prises par les institutions, pas seulement les individus", c: "Changer de carrière après 5 ans", d: "Réduire le contact avec les bénéficiaires" },
        answer: 'b',
        explanation: "Les experts recommandent « des mesures préventives institutionnelles plutôt que de laisser la responsabilité aux individus seuls ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'économie',
        question: "Lisez cette lettre officielle : « Madame, Monsieur, Nous accusons réception de votre dossier de demande de prêt immobilier. Après analyse de votre situation financière, nous sommes au regret de vous informer que votre demande a été refusée. Ce refus est motivé par un ratio d'endettement supérieur à 40 %, critère au-delà duquel notre établissement ne peut accorder de financement. Nous vous invitons à nous recontacter dans 12 mois si votre situation évolue. »\n\nPourquoi la demande de prêt a-t-elle été refusée ?",
        options: { a: "Le client n'a pas fourni tous les documents", b: "Le montant demandé était trop élevé", c: "Le taux d'endettement dépasse le seuil acceptable", d: "La banque a fermé ce service" },
        answer: 'c',
        explanation: "La lettre indique un « ratio d'endettement supérieur à 40 % », ce qui dépasse le critère d'acceptation.",
      },
      {
        section: 'CE', level: 'B2', theme: 'environnement',
        question: "Lisez cet article : « Le Québec s'est engagé à réduire ses émissions de gaz à effet de serre de 37,5 % sous le niveau de 1990, d'ici 2030. Pour atteindre cet objectif ambitieux, le gouvernement mise sur l'électrification des transports, l'efficacité énergétique des bâtiments, et la transition vers une économie circulaire. Les critiques soulignent cependant que ces objectifs nécessiteront des investissements massifs — estimés à 43 milliards de dollars — et une transformation profonde des habitudes de consommation. »\n\nQuel est l'un des axes principaux de la stratégie climatique du Québec ?",
        options: { a: "L'augmentation de la production pétrolière", b: "L'électrification des transports", c: "La construction de nouvelles centrales thermiques", d: "La réduction de la population urbaine" },
        answer: 'b',
        explanation: "Le gouvernement mise notamment sur « l'électrification des transports » pour atteindre ses objectifs climatiques.",
      },
      {
        section: 'CE', level: 'A2', theme: 'quotidien',
        question: "Lisez ce menu : « Café du Plateau — Menu du midi 12h-14h\n• Soupe du jour + pain : 6 $\n• Sandwich + boisson : 12 $\n• Plat du jour (varie chaque jour) : 15 $\n• Dessert du jour : 5 $\nFormule complète (soupe + plat + dessert) : 22 $ »\n\nCombien coûte la formule complète ?",
        options: { a: "15 dollars", b: "20 dollars", c: "22 dollars", d: "26 dollars" },
        answer: 'c',
        explanation: "La formule complète (soupe + plat + dessert) est à 22 $.",
      },
      {
        section: 'CE', level: 'B1', theme: 'santé',
        question: "Lisez ce dépliant : « Campagne de vaccination contre la grippe saisonnière. La vaccination est recommandée pour : les personnes de 75 ans et plus, les femmes enceintes, les personnes atteintes de maladies chroniques, les travailleurs de la santé. Elle est GRATUITE pour ces groupes prioritaires. Pour les autres citoyens, le vaccin coûte 20 $. Rendez-vous dans votre pharmacie ou CLSC. Aucune ordonnance nécessaire. »\n\nPour qui le vaccin est-il GRATUIT ?",
        options: { a: "Pour tous les résidents du Québec", b: "Uniquement pour les enfants de moins de 5 ans", c: "Pour les groupes prioritaires comme les personnes âgées et les femmes enceintes", d: "Pour les étudiants en santé uniquement" },
        answer: 'c',
        explanation: "Le dépliant liste des groupes prioritaires (75 ans+, femmes enceintes, maladies chroniques, travailleurs de la santé) pour lesquels le vaccin est gratuit.",
      },
      {
        section: 'CE', level: 'B2', theme: 'éducation',
        question: "Lisez cet extrait de règlement universitaire : « Tout étudiant qui se présente à une évaluation avec un appareil électronique non autorisé, qui consulte des documents non permis, ou qui communique avec d'autres personnes durant l'examen sera considéré en situation de plagiat. Les sanctions prévues vont d'un zéro sur l'évaluation concernée jusqu'à l'exclusion définitive de l'établissement, selon la gravité et le caractère répétitif de l'infraction. »\n\nQuelle est la sanction MAXIMALE prévue par ce règlement ?",
        options: { a: "Un avertissement écrit", b: "Un zéro sur l'examen", c: "Une suspension d'un semestre", d: "L'exclusion définitive de l'établissement" },
        answer: 'd',
        explanation: "Le règlement précise « jusqu'à l'exclusion définitive de l'établissement, selon la gravité ».",
      },
      {
        section: 'CE', level: 'C1', theme: 'politique',
        question: "Lisez cet article : « La notion de « vivre-ensemble » est au cœur des débats sur l'identité québécoise. Pour certains analystes, elle constitue une réponse pragmatique aux défis du pluralisme, permettant de transcender les différences culturelles par un ensemble de valeurs partagées. Pour d'autres, elle masque une asymétrie de pouvoir fondamentale entre les groupes majoritaires et minoritaires, obligeant ces derniers à adapter leurs pratiques aux normes dominantes plutôt qu'à négocier une véritable réciprocité. »\n\nQuelle critique est formulée contre le concept de « vivre-ensemble » ?",
        options: { a: "Il ne prend pas en compte les valeurs culturelles locales", b: "Il cache un déséquilibre de pouvoir entre groupes majoritaires et minoritaires", c: "Il favorise l'assimilation des groupes majoritaires", d: "Il est trop coûteux à mettre en œuvre" },
        answer: 'b',
        explanation: "Les critiques soulignent que le concept « masque une asymétrie de pouvoir fondamentale » défavorisant les groupes minoritaires.",
      },

      // ═══════════════════════════════════════════════════════════
      // EE — EXPRESSION ÉCRITE (6 sessions × 3 tâches = 18 tâches)
      // ═══════════════════════════════════════════════════════════

      // SESSION 1 — B1 — Thème : Logement & Vie quotidienne
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 1,
        wordCountMin: 30, wordCountMax: 50, timeLimitMin: 5,
        question: "Tâche 1 — Message simple (30-50 mots)\n\nVous venez d'emménager dans un nouvel appartement. Écrivez un SMS à votre voisin(e) du dessus pour lui signaler que le robinet de votre salle de bain coule et que vous entendez de l'eau couler chez vous depuis ce matin.",
        explanation: "Critères : message clair et concis, politesse, description du problème, contact ou demande d'action.",
      },
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 2,
        wordCountMin: 60, wordCountMax: 80, timeLimitMin: 10,
        question: "Tâche 2 — Email (60-80 mots)\n\nVous cherchez un appartement à Montréal. Vous avez vu une annonce pour un appartement de 4 ½ pièces à 1 350 $/mois dans le quartier Rosemont. Écrivez un email au propriétaire pour exprimer votre intérêt, demander si l'appartement est toujours disponible, et proposer une date de visite.",
        explanation: "Critères : formule d'appel adaptée, expression de l'intérêt, questions pertinentes, proposition de rendez-vous, formule de politesse finale.",
      },
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 3,
        wordCountMin: 160, wordCountMax: 200, timeLimitMin: 25,
        question: "Tâche 3 — Texte long (160-200 mots)\n\nDans un forum pour nouveaux immigrants, on vous demande de partager votre expérience de la recherche de logement au Québec. Décrivez les difficultés que vous avez rencontrées (ou que vous imaginez), donnez des conseils pratiques aux personnes qui arrivent, et exprimez votre opinion sur le marché immobilier québécois.",
        explanation: "Critères : structure (introduction, développement, conclusion), vocabulaire varié, connecteurs logiques, opinion personnelle argumentée, respect du nombre de mots.",
      },

      // SESSION 2 — B1 — Thème : Emploi & Intégration professionnelle
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 1,
        wordCountMin: 30, wordCountMax: 50, timeLimitMin: 5,
        question: "Tâche 1 — Message simple (30-50 mots)\n\nVous avez un entretien d'embauche demain matin mais votre réveil est cassé. Écrivez un message à un(e) ami(e) pour lui demander de vous appeler à 7h du matin pour vous réveiller, en expliquant brièvement la raison.",
        explanation: "Critères : demande claire, explication de la raison, ton amical approprié.",
      },
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 2,
        wordCountMin: 60, wordCountMax: 80, timeLimitMin: 10,
        question: "Tâche 2 — Email professionnel (60-80 mots)\n\nVous avez passé un entretien d'embauche la semaine dernière pour un poste de comptable. Écrivez un email à la responsable des ressources humaines, Madame Tremblay, pour la remercier de vous avoir reçu(e), exprimer votre enthousiasme pour le poste, et demander poliment quand vous pourrez avoir une réponse.",
        explanation: "Critères : registre formel, remerciement sincère, intérêt clairement exprimé, question sur les délais, formule de politesse complète.",
      },
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 3,
        wordCountMin: 160, wordCountMax: 200, timeLimitMin: 25,
        question: "Tâche 3 — Lettre de motivation (160-200 mots)\n\nVous postulez pour un poste d'assistant(e) administratif(ve) dans une clinique médicale de Québec. L'offre demande : une bonne maîtrise du français, de l'organisation, et un sens du service. Rédigez une lettre de motivation en présentant votre parcours, vos compétences clés pour ce poste, et votre motivation à travailler dans le domaine de la santé.",
        explanation: "Critères : structure lettre formelle complète (en-tête, objet, corps, conclusion), adéquation profil/poste, exemples concrets, vocabulaire professionnel.",
      },

      // SESSION 3 — B2 — Thème : Société & Opinion
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 1,
        wordCountMin: 30, wordCountMax: 50, timeLimitMin: 5,
        question: "Tâche 1 — Commentaire bref (30-50 mots)\n\nVous lisez sur un forum ce commentaire : « L'immigration coûte trop cher aux contribuables québécois. » Répondez brièvement en exprimant votre désaccord avec un argument.",
        explanation: "Critères : réponse directe, argument pertinent, ton respectueux malgré le désaccord.",
      },
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 2,
        wordCountMin: 80, wordCountMax: 100, timeLimitMin: 12,
        question: "Tâche 2 — Email à la mairie (80-100 mots)\n\nVous habitez dans un quartier de Montréal où il n'y a pas de piste cyclable. De nombreux accidents impliquant des cyclistes se produisent. Écrivez un email au service de la voirie de la mairie pour signaler ce problème, décrire les risques, et demander qu'une piste cyclable soit aménagée dans votre rue.",
        explanation: "Critères : registre formel, description claire du problème, argumentation avec des exemples, demande précise, formule de politesse.",
      },
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 3,
        wordCountMin: 180, wordCountMax: 220, timeLimitMin: 30,
        question: "Tâche 3 — Article pour un journal de quartier (180-220 mots)\n\nVotre association de quartier vous demande d'écrire un article sur le thème : « Comment favoriser l'intégration des nouveaux immigrants dans notre communauté ? » Présentez deux ou trois propositions concrètes, illustrez-les avec des exemples, et expliquez les bénéfices pour l'ensemble de la communauté.",
        explanation: "Critères : style journalistique (titre, paragraphes), propositions réalistes et argumentées, exemples concrets, langage neutre et inclusif, richesse du vocabulaire.",
      },

      // SESSION 4 — B2 — Thème : Éducation & Famille
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 1,
        wordCountMin: 30, wordCountMax: 50, timeLimitMin: 5,
        question: "Tâche 1 — Note informelle (30-50 mots)\n\nVotre enfant a été absent de l'école pendant 3 jours à cause de la grippe. Il est maintenant guéri et reprend l'école demain. Écrivez une note pour son enseignant(e) pour expliquer l'absence et informer que votre enfant peut reprendre ses activités normalement.",
        explanation: "Critères : ton adapté (semi-formel), explication de l'absence, information sur le retour, signature.",
      },
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 2,
        wordCountMin: 80, wordCountMax: 100, timeLimitMin: 12,
        question: "Tâche 2 — Email à l'administration universitaire (80-100 mots)\n\nVous êtes étudiant(e) étranger(ère) et vous n'avez pas reçu votre carte étudiante malgré votre inscription confirmée il y a 3 semaines. Sans cette carte, vous ne pouvez pas accéder à la bibliothèque ni au gymnase. Écrivez un email au service des admissions pour expliquer le problème et demander une solution rapide.",
        explanation: "Critères : ton poli mais ferme, chronologie des faits, impact concret du problème, demande d'action spécifique, formule de politesse.",
      },
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 3,
        wordCountMin: 180, wordCountMax: 220, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (180-220 mots)\n\nSur un site d'opinions, vous répondez à la question : « L'apprentissage d'une deuxième langue doit-il être obligatoire à l'école primaire ? » Rédigez votre réponse en développant votre point de vue avec des arguments et des exemples concrets. Tenez compte des opinions opposées au vôtre.",
        explanation: "Critères : thèse clairement posée, arguments développés avec exemples, contre-arguments pris en compte, connecteurs logiques variés (cependant, néanmoins, en revanche...), conclusion synthétique.",
      },

      // SESSION 5 — A2 — Thème : Vie pratique (niveau débutant)
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 1,
        wordCountMin: 20, wordCountMax: 40, timeLimitMin: 5,
        question: "Tâche 1 — Message (20-40 mots)\n\nVous ne pouvez pas aller au rendez-vous prévu avec votre ami(e) François demain. Envoyez-lui un SMS pour annuler et proposer un autre jour.",
        explanation: "Critères : ton amical, explication simple, proposition alternative.",
      },
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 2,
        wordCountMin: 40, wordCountMax: 60, timeLimitMin: 8,
        question: "Tâche 2 — Email simple (40-60 mots)\n\nVous voulez vous inscrire à un cours de cuisine française qui commence le mois prochain. Écrivez un email au centre communautaire pour vous renseigner sur les horaires, le prix, et comment vous inscrire.",
        explanation: "Critères : questions claires, ton poli, formule de salutation et de politesse.",
      },
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 3,
        wordCountMin: 80, wordCountMax: 120, timeLimitMin: 20,
        question: "Tâche 3 — Description (80-120 mots)\n\nVous venez d'arriver au Québec depuis 2 mois. Écrivez un message sur un forum pour décrire votre vie au Québec : le quartier où vous habitez, les choses que vous aimez, les difficultés que vous rencontrez, et ce qui vous manque de votre pays.",
        explanation: "Critères : présentation de soi, description du quotidien, expression des émotions (positives et négatives), vocabulaire simple mais varié.",
      },

      // SESSION 6 — C1 — Thème : Enjeux contemporains
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 1,
        wordCountMin: 40, wordCountMax: 60, timeLimitMin: 5,
        question: "Tâche 1 — Réaction critique (40-60 mots)\n\nLisez cette affirmation : « Le télétravail généralisé détruit le lien social en entreprise. » En deux ou trois phrases, exposez votre point de vue nuancé sur cette affirmation.",
        explanation: "Critères : nuance, vocabulaire précis, prise de position claire.",
      },
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 2,
        wordCountMin: 100, wordCountMax: 130, timeLimitMin: 15,
        question: "Tâche 2 — Synthèse comparative (100-130 mots)\n\nUn collègue vous demande de rédiger un bref compte rendu comparant deux systèmes d'immigration : le système par points (Canada) et le système familial (États-Unis). Présentez les avantages de chacun de façon objective.",
        explanation: "Critères : objectivité, structure comparative, vocabulaire technique approprié, paragraphes organisés.",
      },
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 3,
        wordCountMin: 220, wordCountMax: 260, timeLimitMin: 35,
        question: "Tâche 3 — Essai argumentatif (220-260 mots)\n\n« L'intelligence artificielle représente une menace pour les emplois qualifiés, y compris dans des domaines traditionnellement réservés aux humains comme la médecine, le droit et l'enseignement. » Rédigez un essai dans lequel vous analysez cette affirmation de manière critique, en intégrant des arguments pour et contre, des exemples précis, et une conclusion personnelle.",
        explanation: "Critères : problématisation claire, argumentation structurée (thèse/antithèse/synthèse), exemples précis et actuels, registre soutenu, richesse lexicale et syntaxique, conclusion nuancée.",
      },

      // ═══════════════════════════════════════════════════════════
      // EO — EXPRESSION ORALE (5 sessions × 3 tâches = 15 tâches)
      // ═══════════════════════════════════════════════════════════

      // SESSION 1 — B1 — Thème : Vie au Canada
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 1,
        timeLimitMin: 3,
        imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600',
        question: "Tâche 1 — Décrire et réagir à une image (2-3 minutes)\n\nRegardez cette image : une famille avec des valises dans un aéroport international, devant un panneau indiquant « Bienvenue au Canada ».\n\nDécrivez ce que vous voyez. Imaginez qui sont ces personnes et d'où elles viennent. Comment pensez-vous qu'elles se sentent à ce moment ? Qu'est-ce qui les attend selon vous ?",
        explanation: "Critères : description organisée de l'image (de général à particulier), imagination créative, expression des émotions, vocabulaire de l'immigration et des sentiments.",
      },
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 2,
        timeLimitMin: 3,
        question: "Tâche 2 — Défendre un point de vue (2-3 minutes)\n\nL'examinateur(trice) vous soumet l'affirmation suivante :\n« S'adapter à une nouvelle culture, c'est forcément perdre une partie de son identité. »\n\nExprimez votre opinion sur cette affirmation. Êtes-vous d'accord ou non ? Développez votre réponse avec au moins deux arguments et des exemples personnels ou concrets.",
        explanation: "Critères : position claire, arguments structurés, exemples pertinents, connecteurs logiques, interaction avec l'affirmation (accord partiel possible).",
      },
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 3,
        timeLimitMin: 4,
        question: "Tâche 3 — Simulation d'interaction (3-4 minutes)\n\nMise en situation : Vous êtes arrivé(e) au Québec il y a 3 mois. Vous appelez le service d'aide aux immigrants de votre ville pour vous renseigner sur les démarches pour faire reconnaître votre diplôme étranger en soins infirmiers. L'examinateur(trice) joue le rôle du conseiller/de la conseillère.\n\nPosez vos questions, exprimez vos préoccupations, et réagissez aux informations données.",
        explanation: "Critères : initiative conversationnelle, questions pertinentes, écoute active et réactions adaptées, registre formel mais naturel, gestion des incompréhensions.",
      },

      // SESSION 2 — B1 — Thème : Travail & Vie professionnelle
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 1,
        timeLimitMin: 3,
        imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600',
        question: "Tâche 1 — Réagir à un document (2-3 minutes)\n\nVous voyez cette offre d'emploi affichée :\n« CHERCHE : Coordinateur(trice) d'événements bilingue (fr/en). Salaire : 45 000-50 000 $/an. Expérience : 2 ans minimum. Télétravail possible 3j/semaine. Entreprise multiculturelle. Postulez sur notre site. »\n\nPrésentez les points positifs et négatifs de cette offre. Ce poste vous conviendrait-il ? Pourquoi ? Qu'est-ce que vous demanderiez si vous passiez l'entretien ?",
        explanation: "Critères : analyse structurée de l'offre, opinion personnelle argumentée, questions d'entretien pertinentes, vocabulaire professionnel.",
      },
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 2,
        timeLimitMin: 3,
        question: "Tâche 2 — Défendre un point de vue (2-3 minutes)\n\n« Il vaut mieux accepter n'importe quel emploi quand on arrive dans un nouveau pays, même si ce n'est pas dans son domaine. »\n\nÊtes-vous d'accord avec cette affirmation ? Développez votre réponse avec des arguments et des exemples.",
        explanation: "Critères : position nuancée possible, arguments équilibrés, exemples de situations réelles ou imaginaires, fluidité du discours.",
      },
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 3,
        timeLimitMin: 4,
        question: "Tâche 3 — Simulation : entretien téléphonique (3-4 minutes)\n\nMise en situation : Une entreprise vous rappelle suite à votre candidature pour un poste de commis comptable. L'examinateur(trice) joue le recruteur/la recruteuse. Il/elle va vous poser des questions sur votre expérience, vos compétences et vos attentes.\n\nRépondez aux questions et posez au moins deux questions sur le poste.",
        explanation: "Critères : présentation professionnelle, réponses précises et structurées, questions pertinentes sur le poste, registre formel, aisance conversationnelle.",
      },

      // SESSION 3 — B2 — Thème : Société & Actualité
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 1,
        timeLimitMin: 4,
        imageUrl: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600',
        question: "Tâche 1 — Analyser un document (3-4 minutes)\n\nVous voyez un graphique montrant que le Québec a accueilli 60 000 immigrants en 2022, contre 35 000 en 2010. Les 5 principaux pays d'origine sont la France, l'Algérie, le Maroc, le Cameroun et Haïti.\n\nCommentez ce graphique : que montre-t-il ? Quelles sont les tendances ? Pourquoi le Québec attire-t-il ces populations selon vous ? Quels sont les enjeux de cette évolution pour la société québécoise ?",
        explanation: "Critères : lecture et interprétation de données, analyse causale, projection et enjeux, vocabulaire statistique et sociologique, structure du commentaire.",
      },
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 2,
        timeLimitMin: 4,
        question: "Tâche 2 — Défendre un point de vue (3-4 minutes)\n\n« Le Québec devrait imposer des quotas stricts sur l'immigration pour préserver son identité culturelle et francophone. »\n\nDonnez votre opinion argumentée sur cette affirmation. Prenez en compte les enjeux démographiques, économiques et culturels dans votre réponse.",
        explanation: "Critères : argumentation structurée et nuancée, utilisation de données ou exemples précis, registre soutenu, gestion de la complexité du sujet, conclusion personnelle.",
      },
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 3,
        timeLimitMin: 5,
        question: "Tâche 3 — Simulation : réunion de quartier (4-5 minutes)\n\nMise en situation : Vous participez à une réunion du conseil de quartier. Le sujet : un promoteur immobilier veut construire une tour de condos à la place du parc de votre quartier. L'examinateur(trice) joue l'animateur(trice) de la réunion et un voisin favorable au projet.\n\nExprimez votre opposition au projet, argumentez, répondez aux contre-arguments, et proposez une alternative.",
        explanation: "Critères : argumentation en temps réel, capacité de réfutation, écoute et adaptation, richesse lexicale, fluidité et conviction.",
      },

      // SESSION 4 — B2 — Thème : Culture & Identité
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 1,
        timeLimitMin: 4,
        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
        question: "Tâche 1 — Décrire et commenter une image (3-4 minutes)\n\nVous voyez une photo d'une salle de classe universitaire où des étudiants de différentes origines ethniques travaillent ensemble sur un projet, avec des drapeaux de divers pays décorant le mur.\n\nDécrivez l'image. Que représente-t-elle selon vous ? Quel message véhicule-t-elle ? En quoi cette diversité est-elle un atout ou un défi dans un contexte éducatif ?",
        explanation: "Critères : description précise, interprétation symbolique, développement de la réflexion sur la diversité, vocabulaire interculturel.",
      },
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 2,
        timeLimitMin: 4,
        question: "Tâche 2 — Défendre un point de vue (3-4 minutes)\n\n« Maîtriser parfaitement le français est la condition sine qua non d'une intégration réussie au Québec. »\n\nDiscutez de cette affirmation. Y a-t-il d'autres facteurs tout aussi importants ? Donnez des exemples tirés de la réalité ou de votre expérience personnelle.",
        explanation: "Critères : déconstruction de l'affirmation, exemples variés, nuance et profondeur de l'analyse, fluidité et richesse du vocabulaire.",
      },
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 3,
        timeLimitMin: 5,
        question: "Tâche 3 — Simulation : demande d'information (4-5 minutes)\n\nMise en situation : Vous voulez vous inscrire à des cours de francisation gratuits offerts par le gouvernement du Québec. L'examinateur(trice) joue le rôle de l'agent(e) du Ministère de l'Immigration. Vous ne connaissez pas encore le système.\n\nPosez des questions sur les critères d'admissibilité, les horaires, la durée, les niveaux disponibles, et ce que vous recevrez à la fin du programme.",
        explanation: "Critères : questions pertinentes et progressives, vocabulaire administratif, compréhension et réaction aux informations reçues, reformulation si nécessaire.",
      },

      // SESSION 5 — A2 — Thème : Vie quotidienne (niveau débutant)
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 1,
        timeLimitMin: 2,
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600',
        question: "Tâche 1 — Décrire une image simple (1-2 minutes)\n\nVous voyez une photo d'un marché en plein air avec des fruits et légumes colorés, des vendeurs et des clients qui discutent.\n\nDécrivez ce que vous voyez : les couleurs, les personnes, ce qui se passe. Aimez-vous faire vos courses dans ce type de marché ? Pourquoi ?",
        explanation: "Critères : description simple mais correcte, vocabulaire du marché et des couleurs, expression d'une opinion simple.",
      },
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 2,
        timeLimitMin: 2,
        question: "Tâche 2 — Répondre à une question (1-2 minutes)\n\nL'examinateur(trice) vous pose cette question :\n« Décrivez votre journée typique depuis votre arrivée au Québec. Qu'est-ce qui est différent de votre pays d'origine ? »\n\nRépondez en donnant des exemples concrets de votre vie quotidienne.",
        explanation: "Critères : description chronologique simple, vocabulaire de la vie quotidienne, comparaison simple entre deux pays, phrases simples et correctes.",
      },
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 3,
        timeLimitMin: 3,
        question: "Tâche 3 — Simulation : au supermarché (2-3 minutes)\n\nMise en situation : Vous êtes au supermarché et vous ne trouvez pas le rayon des produits laitiers. L'examinateur(trice) joue un(e) employé(e) du magasin.\n\nDemandez où se trouve le rayon, demandez l'heure de fermeture du magasin, et demandez si le magasin accepte les paiements par carte.",
        explanation: "Critères : politesse, questions claires et simples, compréhension des réponses, structures interrogatives de base.",
      },

    ],
  });

  const total = await prisma.question.count();
  console.log(`✅ ${total} épreuves insérées avec succès.`);
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
