import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// CO — COMPRÉHENSION DE L'ORAL — Série 1 (39 questions TCF Canada)
// sessionGroup: 'co-serie-1'  audioUrl: null (à renseigner quand les fichiers sont prêts)
// A1: Q1-4 (3 pts)  A2: Q5-10 (9 pts)  B1: Q11-19 (15 pts)
// B2: Q20-29 (21 pts)  C1: Q30-35 (26 pts)  C2: Q36-39 (33 pts)
// ═══════════════════════════════════════════════════════════
const CO_QUESTIONS = [

      // ── A1 — Q1 à Q4 (3 pts / question) ─────────────────────────

      // Q1 : image + 4 propositions entendues — choisir celle qui correspond à l'image
      {
        section: 'CO', level: 'A1', theme: 'bureau', orderNumber: 1, points: 3,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        imageUrl: null, // image à fournir (homme dans un bureau qui invite à s'asseoir)
        transcript: "Proposition A. Voici votre agenda de la journée. Proposition B. Asseyez-vous, je vous en prie. Proposition C. Je vous enverrai les documents par courriel. Proposition D. Nous commençons la réunion dans cinq minutes.",
        question: "Laquelle de ces propositions correspond à l'image ?",
        options: { a: "Voici votre agenda de la journée.", b: "Asseyez-vous, je vous en prie.", c: "Je vous enverrai les documents par courriel.", d: "Nous commençons la réunion dans cinq minutes." },
        answer: 'b',
        explanation: "La proposition B correspond à la situation : un homme dans un bureau invite l'autre personne à s'asseoir.",
      },
      // Q2 : image + 4 propositions entendues
      {
        section: 'CO', level: 'A1', theme: 'hôtel', orderNumber: 2, points: 3,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        imageUrl: null, // image à fournir (homme avec valise à l'accueil d'un hôtel)
        transcript: "Proposition A. Je vous accompagne à votre chambre tout de suite. Proposition B. Votre réservation est bien confirmée. Proposition C. Le restaurant est ouvert jusqu'à vingt-deux heures. Proposition D. Vous pouvez laisser vos bagages là.",
        question: "Laquelle de ces propositions correspond à l'image ?",
        options: { a: "Je vous accompagne à votre chambre tout de suite.", b: "Votre réservation est bien confirmée.", c: "Le restaurant est ouvert jusqu'à vingt-deux heures.", d: "Vous pouvez laisser vos bagages là." },
        answer: 'd',
        explanation: "La proposition D correspond à la situation : un homme avec une valise reçoit la permission de laisser ses bagages à un endroit.",
      },
      {
        section: 'CO', level: 'A1', theme: 'quotidien', orderNumber: 3, points: 3,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Comment allez-vous à votre travail ?",
        question: "Comment cette personne va-t-elle à son travail ?",
        options: { a: "Elle travaille de chez elle trois fois par semaine.", b: "Elle prend le métro et change à Berri.", c: "À pied, elle habite juste à côté.", d: "Elle préfère prendre un taxi le matin." },
        answer: 'c',
        explanation: "La personne répond « À pied, j'habite juste à côté. »",
      },
      {
        section: 'CO', level: 'A1', theme: 'bureau', orderNumber: 4, points: 3,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Je n'arrive pas à faire fonctionner la photocopieuse.",
        question: "Que dit la personne qui aide avec la photocopieuse ?",
        options: { a: "Elle est en panne depuis ce matin.", b: "Tu devrais appeler le technicien.", c: "Regarde, je vais te montrer.", d: "La cartouche d'encre est vide." },
        answer: 'c',
        explanation: "La personne répond « Regarde, je vais te montrer. »",
      },

      // ── A2 — Q5 à Q10 (9 pts / question) ────────────────────────

      {
        section: 'CO', level: 'A2', theme: 'loisirs', orderNumber: 5, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Tu veux faire du ski avec moi pendant les vacances de Noël ?",
        question: "Comment la personne répond-elle à l'invitation de faire du ski ?",
        options: { a: "Je ne suis pas libre ce week-end, désolée.", b: "Bonne idée. J'adore la neige.", c: "Il fait trop froid pour sortir dehors.", d: "Je préfère rester à la maison en famille." },
        answer: 'b',
        explanation: "La personne répond « Bonne idée. J'adore la neige. »",
      },
      {
        section: 'CO', level: 'A2', theme: 'voyages', orderNumber: 6, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Quand pars-tu en vacances, Sylvie ?",
        question: "Quand Sylvie part-elle en vacances ?",
        options: { a: "Mardi prochain.", b: "La semaine prochaine pour deux semaines.", c: "En août, elle a pris deux semaines de congé.", d: "Pas avant la fin du mois." },
        answer: 'a',
        explanation: "Sylvie répond « J'ai mon vol mardi prochain. »",
      },
      {
        section: 'CO', level: 'A2', theme: 'culture', orderNumber: 7, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Qui a écrit ce roman ?",
        question: "Que dit la personne sur l'auteur du roman ?",
        options: { a: "C'est un jeune auteur.", b: "Il a été traduit en plusieurs langues.", c: "Elle l'a acheté à la librairie hier.", d: "L'histoire se passe au dix-neuvième siècle." },
        answer: 'a',
        explanation: "La personne répond « C'est un jeune auteur. »",
      },
      {
        section: 'CO', level: 'A2', theme: 'cuisine', orderNumber: 8, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "J'ai pensé faire du poulet aux champignons pour le souper.",
        question: "Comment la personne réagit-elle à l'idée du poulet aux champignons ?",
        options: { a: "Ce sera parfait avec du riz.", b: "Je n'aime pas les champignons.", c: "On peut aussi commander une pizza.", d: "Il faudra aller faire les courses d'abord." },
        answer: 'a',
        explanation: "La personne répond « Ce sera parfait avec du riz. »",
      },
      {
        section: 'CO', level: 'A2', theme: 'services', orderNumber: 9, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Excusez-moi, est-ce qu'il y a une boîte aux lettres près d'ici ? J'ai du courrier à envoyer.",
        question: "Qu'est-ce que cette personne cherche à faire ?",
        options: { a: "Acheter des médicaments.", b: "Envoyer une lettre.", c: "Prendre un transport.", d: "Voir un film." },
        answer: 'b',
        explanation: "La personne dit « J'ai du courrier à envoyer » — elle cherche à envoyer une lettre.",
      },
      {
        section: 'CO', level: 'A2', theme: 'études', orderNumber: 10, points: 9,
        timeLimitMin: 1,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Je suis vraiment inquiète. Je n'ai pas du tout révisé mon cours d'histoire pour l'examen de demain. Je n'ai aucune chance de réussir.",
        question: "De quoi Laura a-t-elle peur ?",
        options: { a: "D'arriver en retard.", b: "D'avoir une mauvaise note.", c: "De manquer de temps.", d: "De tomber malade." },
        answer: 'b',
        explanation: "Laura dit « Je n'ai aucune chance de réussir » — elle a peur d'avoir une mauvaise note.",
      },

      // ── B1 — Q11 à Q19 (15 pts / question) ──────────────────────

      {
        section: 'CO', level: 'B1', theme: 'technologie', orderNumber: 11, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Léo est désespéré. Depuis hier soir, Internet ne fonctionne plus chez lui. Or, il travaille à domicile et tout passe par la connexion : ses courriels, ses réunions à distance, ses échanges avec ses clients. Sans Internet, il est complètement bloqué.",
        question: "Quel est le principal problème de Léo sans Internet ?",
        options: { a: "La communication avec ses clients.", b: "La recherche d'un nouveau travail.", c: "L'achat d'un nouveau téléphone fixe.", d: "L'utilisation de son ordinateur portable." },
        answer: 'a',
        explanation: "Sans Internet, Léo ne peut plus communiquer avec ses clients : « ses échanges avec ses clients ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'culture', orderNumber: 12, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Tu as vu le programme de la semaine ? Il y a trois belles sorties. — Ah oui ? C'est quoi ? — D'abord Liberté, ensuite Séraphine, et vendredi soir L'Arbre. Deux séances le soir et une le dimanche après-midi. — Super, on y va ?",
        question: "De quoi parlent ces deux personnes ?",
        options: { a: "De cinéma.", b: "De lecture.", c: "De musique.", d: "De théâtre." },
        answer: 'a',
        explanation: "Les deux personnes parlent de films à l'affiche — elles parlent de cinéma.",
      },
      {
        section: 'CO', level: 'B1', theme: 'commerce', orderNumber: 13, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Allô, bonjour. C'est Monsieur Didier à l'appareil. J'ai passé une commande hier pour trois ordinateurs portables. Mais j'aimerais en ajouter deux de plus à ma commande. Pouvez-vous faire la modification ?",
        question: "Pourquoi Monsieur Didier téléphone-t-il ?",
        options: { a: "Pour annuler un achat.", b: "Pour modifier une commande.", c: "Pour réclamer un paquet.", d: "Pour retourner un colis." },
        answer: 'b',
        explanation: "Monsieur Didier veut « ajouter deux de plus à ma commande » — il appelle pour modifier sa commande.",
      },
      {
        section: 'CO', level: 'B1', theme: 'école', orderNumber: 14, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Bonjour à tous. J'ai le regret de vous informer que Monsieur Duval ne pourra pas assurer son cours de statistiques ce matin en raison d'un problème personnel. Le cours est donc annulé. Nous vous tiendrons informés pour le rattrapage.",
        question: "De quoi traite ce message ?",
        options: { a: "L'annulation d'un cours.", b: "Le retard d'un professeur.", c: "Les horaires d'un examen.", d: "Un changement de salle." },
        answer: 'a',
        explanation: "Le message annonce que « le cours est donc annulé ».",
      },
      {
        section: 'CO', level: 'B1', theme: 'tourisme', orderNumber: 15, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Vous habitez en Auvergne, Anne-Marie ? — Non, non, je vis à Lyon. Mais j'adore cette région, alors chaque année je prends mes vacances ici. Cette année, je suis arrivée lundi et je repars dimanche. — C'est vraiment magnifique, vous avez raison.",
        question: "Pourquoi Anne-Marie est-elle en Auvergne ?",
        options: { a: "Elle passe ses congés dans la région.", b: "Elle réside là depuis son enfance.", c: "Elle travaille dans le tourisme local.", d: "Elle vient participer à un concours." },
        answer: 'a',
        explanation: "Anne-Marie dit « chaque année je prends mes vacances ici » — elle est en vacances.",
      },
      {
        section: 'CO', level: 'B1', theme: 'enseignement', orderNumber: 16, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Pascale, vous enseignez depuis quinze ans. Qu'est-ce qui vous plaît le plus dans votre métier ? — Oh, plusieurs choses... Les collègues sont super, l'ambiance est bonne. Mais ce que j'apprécie vraiment, c'est le contact humain. Les enseignants bien sûr, mais surtout les enfants. Leurs réactions, leur curiosité, c'est vraiment ce qui me motive chaque matin.",
        question: "Qu'est-ce que Pascale apprécie le plus dans son métier ?",
        options: { a: "La répartition des horaires.", b: "Le contact avec les élèves.", c: "Les activités pédagogiques.", d: "L'organisation des leçons." },
        answer: 'b',
        explanation: "Pascale dit que ce qui la motive, c'est « surtout les enfants » et leur contact.",
      },
      {
        section: 'CO', level: 'B1', theme: 'emploi', orderNumber: 17, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Bonjour, je m'appelle Thomas Leblanc. J'ai envoyé ma candidature pour le poste de responsable logistique il y a une semaine — mon CV et ma lettre de motivation. Je voudrais savoir si vous avez bien reçu mon dossier. Pouvez-vous me le confirmer ?",
        question: "Pourquoi Thomas Leblanc téléphone-t-il ?",
        options: { a: "Confirmer la date d'un entretien d'embauche.", b: "Se renseigner sur les conditions de travail.", c: "S'informer sur une formation professionnelle.", d: "Vérifier si un courrier est bien arrivé." },
        answer: 'd',
        explanation: "Thomas veut savoir « si vous avez bien reçu mon dossier » — il vérifie si son courrier est arrivé.",
      },
      {
        section: 'CO', level: 'B1', theme: 'commerce', orderNumber: 18, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Comment s'est passé ton achat sur ce site de vente en ligne ? — Pas terrible. J'avais commandé une robe verte, mais j'ai reçu la rouge. Quand j'ai voulu l'échanger, c'était vraiment compliqué. Il fallait envoyer un formulaire, attendre une validation, payer les frais de retour... Bref, j'ai perdu une semaine pour rien.",
        question: "Quel problème cette personne a-t-elle rencontré ?",
        options: { a: "Le prix élevé des produits.", b: "Les délais pour être livrée.", c: "Les difficultés en cas d'échange.", d: "Les tailles de vêtements différentes." },
        answer: 'c',
        explanation: "La personne décrit les complications pour faire un échange : formulaire, validation, frais de retour.",
      },
      {
        section: 'CO', level: 'B1', theme: 'travail', orderNumber: 19, points: 15,
        timeLimitMin: 2,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— La situation a bien changé depuis mes débuts. Quand je cherchais du travail, il suffisait de se présenter à la porte d'une entreprise et on était souvent embauché dans la semaine. Aujourd'hui, pour un seul poste, on reçoit cinquante candidatures. Les jeunes accumulent les diplômes et les stages, et c'est encore très difficile de trouver. Le marché est devenu impitoyable.",
        question: "Quelle observation cette personne fait-elle sur le marché du travail ?",
        options: { a: "Les conditions de recrutement sont plus difficiles aujourd'hui.", b: "Les étudiants ignorent le fonctionnement de l'entreprise.", c: "Les jeunes étaient préparés plus sérieusement dans le passé.", d: "Les patrons actuels ont un degré d'exigence trop élevé." },
        answer: 'a',
        explanation: "La personne compare : avant, c'était facile de trouver du travail ; maintenant, « le marché est devenu impitoyable ».",
      },

      // ── B2 — Q20 à Q29 (21 pts / question) ──────────────────────

      {
        section: 'CO', level: 'B2', theme: 'commerce', orderNumber: 20, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Bonjour madame, je cherche le dernier roman de Marie Dupont, Le Temps suspendu. — Je suis désolée, il est épuisé en ce moment. Nous en attendons un réassort la semaine prochaine. — Oh, c'est dommage. — Je peux vous mettre un exemplaire de côté si vous voulez. Vous n'aurez qu'à rappeler dans une semaine pour confirmer.",
        question: "Qu'est-ce que la vendeuse propose à la cliente ?",
        options: { a: "D'acheter un autre roman.", b: "D'attendre en magasin.", c: "De réserver un livre.", d: "De revenir le lendemain." },
        answer: 'c',
        explanation: "La vendeuse propose de « mettre un exemplaire de côté » — c'est une réservation.",
      },
      {
        section: 'CO', level: 'B2', theme: 'météo', orderNumber: 21, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Voici le bulletin météo du jour. Après une journée d'hier entièrement pluvieuse sur l'ensemble du territoire, la situation s'améliore progressivement ce matin. Il fait toujours froid, avec des températures autour de cinq degrés, mais le soleil fait son apparition dans la plupart des régions. On peut donc parler d'une amélioration sensible par rapport à la veille.",
        question: "Quel temps fait-il aujourd'hui par rapport à hier ?",
        options: { a: "Il fait plus beau qu'hier.", b: "Il fait plus mauvais qu'hier.", c: "Il pleut plus qu'hier.", d: "Il y a moins de soleil qu'hier." },
        answer: 'a',
        explanation: "La situation « s'améliore progressivement » par rapport à « une journée d'hier entièrement pluvieuse ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'langues', orderNumber: 22, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Sylvie, vous défendez depuis longtemps l'apprentissage des langues étrangères. Pouvez-vous nous expliquer pourquoi c'est si important pour vous ? — Oui, absolument. Pour moi, apprendre une langue, c'est bien plus qu'acquérir des compétences techniques. C'est construire des ponts entre les peuples. Une langue, c'est une passerelle qui permet de comprendre l'autre, de partager une culture, de créer des échanges authentiques entre des personnes de nationalités différentes. Sans ce dialogue linguistique, on reste enfermés dans nos propres frontières.",
        question: "Qu'est-ce que Sylvie veut promouvoir ?",
        options: { a: "La diffusion d'une langue qui exprime les nuances des sentiments.", b: "La multiplication des actions pour la défense des droits de l'homme.", c: "La promotion d'un moyen d'échanges entre les différentes nationalités.", d: "La reconnaissance d'un patrimoine culturel unique par sa richesse." },
        answer: 'c',
        explanation: "Sylvie parle de « créer des échanges authentiques entre des personnes de nationalités différentes ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'famille', orderNumber: 23, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Les chercheurs qui étudient les relations parents-adolescents ont relevé une différence significative entre garçons et filles. Les jeunes filles entrent en conflit avec leurs parents beaucoup plus rapidement que les garçons, et ce dès l'adolescence. Ces conflits portent principalement sur des sujets du quotidien : les vêtements, l'argent de poche, le temps passé devant la télévision, les sorties avec les amis et les premières relations amoureuses.",
        question: "Qu'ont observé les chercheurs à propos des jeunes filles ?",
        options: { a: "Elles entrent dans la vie active avant les jeunes garçons.", b: "Elles se rebellent très vite face à l'autorité familiale au quotidien.", c: "Elles sont en désaccord avec leurs parents au sujet de leurs études.", d: "Elles sont mieux préparées aux tâches de tous les jours." },
        answer: 'b',
        explanation: "Les filles « entrent en conflit avec leurs parents beaucoup plus rapidement » sur des sujets du quotidien.",
      },
      {
        section: 'CO', level: 'B2', theme: 'voyages', orderNumber: 24, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Alors, vous avez des projets pour les prochaines vacances ? — Oui, avec ma femme on a envie de visiter le sud de la France. On n'y est jamais allé. On pense aller à Nice, Marseille, et peut-être l'Ardèche. — Oh, vous allez adorer ! La Côte d'Azur, la gastronomie, le paysage... — C'est exactement ce qu'on cherche. Découvrir cette région, profiter du soleil, goûter les spécialités locales.",
        question: "Que souhaitent faire l'homme et sa femme ?",
        options: { a: "Découvrir une région de France.", b: "Partir vivre sur la Côte d'Azur.", c: "Rejoindre son épouse dans le Sud.", d: "Rendre visite à un ami français." },
        answer: 'a',
        explanation: "L'homme dit « on a envie de visiter le sud de la France » pour « découvrir cette région ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'nature', orderNumber: 25, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Le lac est gelé depuis trois semaines, et pourtant les pêcheurs sont là, fidèles à leur passion. Sur la surface blanche et immobile, on aperçoit des dizaines de petites cabanes en bois. Chaque pêcheur y a installé son abri personnel pour se protéger du froid glacial qui peut descendre jusqu'à moins vingt degrés. À l'intérieur, un petit poêle leur permet de passer des heures à attendre que le poisson morde.",
        question: "Pourquoi chaque pêcheur installe-t-il une cabane sur le lac ?",
        options: { a: "Pour conserver le poisson.", b: "Pour ranger leur matériel.", c: "Pour se réchauffer.", d: "Pour se reposer." },
        answer: 'c',
        explanation: "Chaque pêcheur installe son abri « pour se protéger du froid glacial » — pour se réchauffer.",
      },
      {
        section: 'CO', level: 'B2', theme: 'travail', orderNumber: 26, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Claudine, on ne vous voit plus au bureau depuis quelques semaines. Qu'est-ce qui se passe ? — Oh, vous n'êtes pas au courant ? J'ai pris ma retraite le mois dernier. — Vraiment ! Vous avez fait ça discrètement ! — Oui, j'ai préféré partir sans grande cérémonie. Trente-deux ans dans la même entreprise, c'est suffisant ! Je profite maintenant de mon temps libre.",
        question: "Quelle est la situation de Claudine ?",
        options: { a: "Elle a arrêté d'exercer sa profession.", b: "Elle a décidé d'enrichir son curriculum vitae.", c: "Elle a obtenu un congé de longue durée.", d: "Elle a réduit son nombre d'heures de travail." },
        answer: 'a',
        explanation: "Claudine dit « J'ai pris ma retraite le mois dernier » — elle a arrêté de travailler.",
      },
      {
        section: 'CO', level: 'B2', theme: 'cinéma', orderNumber: 27, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Alors, tu as aimé le film ? — Globalement oui, l'histoire était bien, les acteurs étaient excellents. Mais tu as remarqué la bande sonore ? — Oui, je voulais justement en parler. C'était bizarre. Les morceaux ne correspondaient pas du tout à l'époque du film. Ils mélangeaient des chansons des années soixante-dix avec de la musique contemporaine. — Exactement. Et c'était vraiment mal soigné. Ça gâchait les scènes les plus émouvantes.",
        question: "Quel aspect du film les deux amis critiquent-ils ?",
        options: { a: "Le jeu de l'acteur.", b: "Les dialogues.", c: "La musique.", d: "Le scénario." },
        answer: 'c',
        explanation: "Ils critiquent la « bande sonore » : « les morceaux ne correspondaient pas du tout à l'époque du film ».",
      },
      {
        section: 'CO', level: 'B2', theme: 'langues', orderNumber: 28, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Vous parlez très bien anglais. Comment l'avez-vous appris ? — Merci. J'ai eu la chance, après mon diplôme, de partir aux États-Unis pendant deux ans. J'étais assistante dans une école maternelle à Chicago, où je travaillais directement sous la direction d'une institutrice américaine. C'était une expérience formidable, autant pour la langue que pour la pédagogie.",
        question: "Comment cette personne a-t-elle amélioré son anglais ?",
        options: { a: "Elle a gardé des enfants dans une famille britannique.", b: "Elle a passé son enfance dans un pays étranger.", c: "Elle a suivi des études dans un lycée bilingue.", d: "Elle a travaillé avec une institutrice américaine." },
        answer: 'd',
        explanation: "Elle travaillait « directement sous la direction d'une institutrice américaine » à Chicago.",
      },
      {
        section: 'CO', level: 'B2', theme: 'architecture', orderNumber: 29, points: 21,
        timeLimitMin: 3,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "La Fondation Eiffel vient de lancer son concours annuel destiné aux étudiants en architecture. Cette année, la consigne donnée aux participants était d'imaginer, de rêver, sans contrainte technique ou budgétaire. Les étudiants devaient concevoir des projets totalement imaginaires autour de la tour Eiffel — que ce soit une extension, une transformation, ou une réinterprétation complète du monument. Les propositions reçues témoignent d'une créativité remarquable.",
        question: "De quoi parle ce reportage ?",
        options: { a: "D'un appel à projets imaginaires.", b: "D'un examen de fin d'études.", c: "D'un nouveau plan d'urbanisme.", d: "D'une rénovation d'un monument." },
        answer: 'a',
        explanation: "Les étudiants devaient « concevoir des projets totalement imaginaires » — c'est un appel à projets imaginaires.",
      },

      // ── C1 — Q30 à Q35 (26 pts / question) ──────────────────────

      {
        section: 'CO', level: 'C1', theme: 'patrimoine', orderNumber: 30, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Ce site archéologique fait partie du patrimoine mondial, et pourtant sa survie est sérieusement menacée. Non pas par le temps, ni par les intempéries, mais bien par les visiteurs eux-mêmes. L'inconscience de certains touristes est alarmante : ils grimpent sur les vestiges, touchent les fresques, laissent des graffitis, se comportent comme si c'était un parc d'attractions. Ces comportements contribuent directement à la dégradation irréversible de ce lieu exceptionnel. Les autorités sont dépassées par l'ampleur du problème.",
        question: "Quelle est la principale menace pour ce site archéologique ?",
        options: { a: "L'attitude des touristes accélère sa dégradation.", b: "Le financement des travaux d'entretien est menacé.", c: "Les autorités restaurent actuellement les vestiges.", d: "L'intérêt pour l'architecture des lieux est en déclin." },
        answer: 'a',
        explanation: "La menace vient des visiteurs eux-mêmes : graffitis, escalade des vestiges, comportements irresponsables.",
      },
      {
        section: 'CO', level: 'C1', theme: 'loisirs', orderNumber: 31, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Vous pratiquez la randonnée depuis plus de trente ans. Qu'est-ce que cela représente pour vous ? — C'est difficile à résumer. La randonnée, c'est une façon de rencontrer. De rencontrer le paysage, les autres, et soi-même. Quand on marche pendant des heures en montagne, on découvre des endroits magnifiques mais aussi des personnes extraordinaires, avec leurs histoires, leurs cultures. Et on apprend à se connaître soi-même, à aller au-delà de ses limites. C'est vraiment un temps de découverte et d'humanité.",
        question: "Pour cette personne, que représente la randonnée ?",
        options: { a: "C'est un temps de découverte et d'humanité.", b: "C'est une occasion de dépenser son énergie.", c: "C'est une opportunité d'apprécier la solitude.", d: "C'est une possibilité quotidienne d'évasion." },
        answer: 'a',
        explanation: "La personne conclut : « C'est vraiment un temps de découverte et d'humanité. »",
      },
      {
        section: 'CO', level: 'C1', theme: 'restauration', orderNumber: 32, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Philippe, vous venez d'ouvrir un lieu assez insolite à Paris. Pouvez-vous nous en parler ? — Avec plaisir. L'idée, c'était de créer un espace où les gens pourraient vivre plusieurs expériences en même temps. On peut venir manger, je propose une cuisine du marché, fraîche et créative. Mais en même temps, les murs sont couverts d'œuvres d'artistes contemporains, que les clients peuvent admirer pendant le repas, et même acheter. Le soir, il y a parfois des concerts de jazz ou de musique classique. C'est vraiment un endroit hybride, entre restaurant et galerie.",
        question: "Quelle est la particularité de l'établissement de Philippe ?",
        options: { a: "C'est la reproduction d'un café du siècle dernier.", b: "Il contient un dépôt-vente de meubles design.", c: "C'est à la fois un restaurant et une galerie d'art.", d: "Il y organise un festival de musique électronique." },
        answer: 'c',
        explanation: "Philippe décrit son lieu comme « hybride, entre restaurant et galerie ».",
      },
      {
        section: 'CO', level: 'C1', theme: 'sciences', orderNumber: 33, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "Le biomimétisme est une discipline scientifique qui connaît un essor considérable depuis quelques décennies. Son principe est simple : s'inspirer des solutions que la nature a développées au cours de millions d'années d'évolution pour résoudre des problèmes techniques humains. Ainsi, les ingénieurs aéronautiques ont étudié le vol des oiseaux pour améliorer les ailes des avions. Des chercheurs en robotique s'inspirent du déplacement des pieuvres pour concevoir des robots souples. L'architecture étudie les structures des nids de termites pour optimiser la ventilation naturelle des bâtiments. La nature comme modèle, c'est le cœur même de cette approche.",
        question: "En quoi consiste le biomimétisme ?",
        options: { a: "À comparer les étapes du clonage naturel et artificiel.", b: "À observer l'effet des activités humaines sur la nature.", c: "À orienter la recherche en prenant la nature comme modèle.", d: "À sensibiliser les hommes à respecter leur milieu naturel." },
        answer: 'c',
        explanation: "Le biomimétisme consiste à « s'inspirer des solutions que la nature a développées » — prendre la nature comme modèle.",
      },
      {
        section: 'CO', level: 'C1', theme: 'démographie', orderNumber: 34, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "La démographie du vieillissement est souvent présentée comme un fardeau économique. Mais certains économistes commencent à inverser ce point de vue. Les seniors représentent en réalité un gisement considérable de croissance. Pensez aux services d'aide à domicile : selon les projections du ministère, deux cent vingt mille emplois devraient être créés dans ce secteur d'ici dix ans, directement liés aux besoins de la population vieillissante. L'industrie médicale, les résidences adaptées, les loisirs seniors — tout cela génère de l'activité économique et des emplois.",
        question: "Pourquoi certains économistes voient-ils les seniors positivement ?",
        options: { a: "Ils consomment plus que la jeune génération.", b: "Ils dépensent beaucoup pour leur santé.", c: "Ils profitent peu des effets de la croissance.", d: "Ils sont à l'origine de créations d'emplois." },
        answer: 'd',
        explanation: "Les seniors créent de la demande pour des services, générant 220 000 emplois — ils sont à l'origine de créations d'emplois.",
      },
      {
        section: 'CO', level: 'C1', theme: 'consommation', orderNumber: 35, points: 26,
        timeLimitMin: 4,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Pourquoi avez-vous choisi de passer aux cosmétiques biologiques ? — C'est une démarche globale pour moi. J'essaie de consommer de manière plus responsable, de réduire mon impact sur l'environnement. Les produits bio, ils sont en accord avec mes idées. Je sais qu'ils ne contiennent pas de substances chimiques douteuses, que leur fabrication respecte certains principes éthiques. Ce n'est pas une question d'efficacité ou de prix — c'est vraiment une question de cohérence avec mes valeurs.",
        question: "Pourquoi cette personne a-t-elle choisi les cosmétiques biologiques ?",
        options: { a: "Ils dégagent une odeur agréable.", b: "Ils ont des résultats spectaculaires.", c: "Ils ont l'avantage d'être peu chers.", d: "Ils répondent à ses convictions." },
        answer: 'd',
        explanation: "La personne choisit ces produits par « cohérence avec mes valeurs » — pour des raisons de convictions.",
      },

      // ── C2 — Q36 à Q39 (33 pts / question) ──────────────────────

      {
        section: 'CO', level: 'C2', theme: 'politique', orderNumber: 36, points: 33,
        timeLimitMin: 5,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Le service civique devrait-il devenir obligatoire selon vous, Nadia Bellaoui ? — Je vais vous répondre avec la nuance que ce sujet mérite. Le service civique, tel qu'il existe aujourd'hui, repose sur le volontariat. Et c'est précisément ce qui fait sa force. Les jeunes qui s'y engagent le font parce qu'ils le veulent, parce qu'ils croient en quelque chose. Et ça, ça change tout à la qualité de l'engagement. Quand vous obligez quelqu'un à faire quelque chose, vous détruisez souvent la motivation intrinsèque. Rendre cela obligatoire risquerait de transformer une expérience enrichissante en corvée administrative. Le dispositif fonctionne bien tel qu'il est : amplifions-le, donnons-lui plus de moyens, mais conservons son caractère volontaire.",
        question: "Quelle est la position de Nadia Bellaoui sur le service civique ?",
        options: { a: "C'est aux parents de choisir pour leurs enfants.", b: "Il faut l'étendre à toutes les générations.", c: "Le dispositif fonctionne bien tel qu'il est.", d: "L'État doit l'imposer à la population." },
        answer: 'c',
        explanation: "Nadia Bellaoui dit : « Le dispositif fonctionne bien tel qu'il est » et il faut « conserver son caractère volontaire ».",
      },
      {
        section: 'CO', level: 'C2', theme: 'arts', orderNumber: 37, points: 33,
        timeLimitMin: 5,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Nous allons parler aujourd'hui de deux figures majeures de la sculpture française. Quand on évoque Camille Claudel, son nom est presque toujours associé à celui de Rodin. Quelle était exactement leur relation ? — C'est une relation complexe, à la fois artistique, amoureuse et professionnelle. Camille a été l'élève de Rodin, elle a reçu de lui une formation artistique exceptionnelle. Mais elle n'était pas qu'une disciple. Elle avait un talent propre, une vision originale. Ses œuvres témoignent d'une sensibilité et d'une force créatrice uniques. Ce qui est fascinant, c'est que malgré tout ce qu'elle a reçu de lui, elle a su créer une œuvre résolument différente, personnelle, reconnaissable entre mille.",
        question: "De quoi traite principalement cette intervention ?",
        options: { a: "La relation liant Camille Claudel et Rodin.", b: "La richesse du musée Auguste Rodin.", c: "Les difficultés rencontrées par Rodin.", d: "Les sources d'inspiration de Rodin." },
        answer: 'a',
        explanation: "L'intervenant décrit en détail la « relation complexe, à la fois artistique, amoureuse et professionnelle » entre Camille Claudel et Rodin.",
      },
      {
        section: 'CO', level: 'C2', theme: 'autochtones', orderNumber: 38, points: 33,
        timeLimitMin: 5,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Les Nations Innus ont rencontré le ministre hier. Quelle est leur position sur ce projet de développement ? — Leur position est claire : elles ne s'opposent pas systématiquement au développement économique sur leur territoire. Mais elles veulent des garanties concrètes. Le conseiller juridique de la Nation a été très précis lors de la conférence de presse : il faut une entente formelle avec le gouvernement qui garantisse la formation professionnelle des jeunes Innus, des emplois valorisants dans l'entreprise et un partage équitable des retombées économiques. Pas des promesses vagues. Des garanties réelles et tangibles, inscrites dans un accord contraignant.",
        question: "Que réclament les Nations Innus ?",
        options: { a: "Elles demandent un nouveau statut juridique.", b: "Elles exigent des garanties réelles et tangibles.", c: "Elles mettent en doute la viabilité du projet.", d: "Elles veulent que les terres restent intactes." },
        answer: 'b',
        explanation: "Les Nations Innus veulent « des garanties réelles et tangibles, inscrites dans un accord contraignant ».",
      },
      {
        section: 'CO', level: 'C2', theme: 'économie', orderNumber: 39, points: 33,
        timeLimitMin: 5,
        sessionGroup: 'co-serie-1',
        audioUrl: null,
        transcript: "— Le débat sur l'exploitation pétrolière en zone arctique est revenu au cœur des discussions internationales. Quelle est votre analyse ? — Le discours des sociétés pétrolières est toujours le même : des retombées économiques considérables, des emplois, le développement des régions concernées. Mais quand on regarde les chiffres de près, les gains économiques sont bien en deçà de ce qu'on nous promet. Les coûts d'exploitation dans ces conditions climatiques extrêmes sont astronomiques. Et on ne parle pas des risques environnementaux, qui sont eux bien réels. Les entreprises ont clairement tendance à exagérer la rentabilité de ces projets pour obtenir les autorisations dont elles ont besoin.",
        question: "Que dit l'intervenant sur les sociétés pétrolières ?",
        options: { a: "Elle est régie par des normes internationales strictes.", b: "Elle est réputée sans danger pour le milieu naturel.", c: "Les inconvénients qu'elle présente sont manifestes.", d: "Les sociétés de production en exagèrent la rentabilité." },
        answer: 'd',
        explanation: "L'intervenant dit que les entreprises « ont clairement tendance à exagérer la rentabilité de ces projets ».",
      },

];

// ═══════════════════════════════════════════════════════════
// CE — COMPRÉHENSION DES ÉCRITS
// ═══════════════════════════════════════════════════════════
const CE_QUESTIONS = [
      {
        section: 'CE', level: 'A2', theme: 'logement',
        question: "Lisez cette annonce : « À LOUER — Appartement 3½ au centre-ville de Montréal. 2e étage, sans ascenseur. Chauffage et eau chaude inclus. Stationnement en sus. 1 200 $/mois. Disponible le 1er juillet. Non-fumeurs. Pas d'animaux. »\n\nQu'est-ce qui est INCLUS dans le loyer ?",
        options: { a: "Le stationnement", b: "Le chauffage et l'eau chaude", c: "Internet et câble", d: "L'électricité" },
        answer: 'b',
        explanation: "L'annonce précise « Chauffage et eau chaude inclus ». Le stationnement est « en sus ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'formation',
        question: "Lisez cette publicité : « COURS DE FRANÇAIS GRATUITS pour nouveaux arrivants. Niveaux A1 à B1. Horaires flexibles : matin, après-midi ou soir. Inscription en ligne. Places limitées. Centre communautaire La Boussole, 45 rue Beaubien. »\n\nPour qui ces cours sont-ils destinés ?",
        options: { a: "À tous les adultes francophones", b: "Aux étudiants universitaires", c: "Aux nouveaux arrivants", d: "Aux enfants de 6 à 12 ans" },
        answer: 'c',
        explanation: "La publicité précise « pour nouveaux arrivants ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'immigration',
        question: "Lisez cet extrait : « Pour obtenir votre CSQ, vous devez soumettre : votre formulaire rempli, une copie de votre passeport, les résultats de votre test de langue (TCF ou TEF Canada), vos diplômes traduits, et les frais de 822 $. Le délai de traitement est de 18 à 24 mois. »\n\nQuel est l'un des documents requis pour le CSQ ?",
        options: { a: "Un billet d'avion aller-retour", b: "Une offre d'emploi du Québec", c: "Les résultats d'un test de langue", d: "Un extrait de casier judiciaire" },
        answer: 'c',
        explanation: "Le texte liste « les résultats de votre test de langue (TCF ou TEF Canada) ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'travail',
        question: "Lisez cette offre : « TECHNICIEN(NE) EN INFORMATIQUE — Salaire : 55 000 $ à 65 000 $/an. Exigences : DEC en informatique, 2 ans d'expérience, bilinguisme français-anglais (un atout). Avantages : assurances, 3 semaines de vacances, télétravail 2 jours/semaine. »\n\nLe bilinguisme est-il obligatoire pour ce poste ?",
        options: { a: "Oui, c'est une exigence absolue", b: "Non, c'est un atout apprécié", c: "Seulement pour les réunions", d: "L'annonce ne le mentionne pas" },
        answer: 'b',
        explanation: "L'annonce précise « bilinguisme français-anglais (un atout) » — un atout n'est pas une obligation.",
      },
      {
        section: 'CE', level: 'B1', theme: 'culture',
        question: "Lisez ce programme : « FESTIVAL DES CULTURES DU MONDE — Samedi 15 juillet, de 10h à 22h. Parc Jarry. Spectacles de danse, concerts, expositions. Entrée gratuite. Navette gratuite depuis la station De Castelnau toutes les 30 minutes. »\n\nComment les visiteurs peuvent-ils se rendre au festival sans voiture ?",
        options: { a: "En taxi gratuit", b: "En navette depuis une station de métro", c: "À pied depuis le centre-ville", d: "Il n'y a pas d'option de transport" },
        answer: 'b',
        explanation: "Le programme propose « une navette gratuite depuis la station De Castelnau ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'société',
        question: "Lisez cet article : « La fatigue de compassion est documentée chez les travailleurs sociaux. Ces professionnels développent des symptômes similaires au burn-out : épuisement émotionnel, dépersonnalisation. Les experts recommandent des mesures institutionnelles — supervision clinique obligatoire, réduction de la charge de travail — plutôt que de laisser la responsabilité aux individus. »\n\nQuelle approche les experts recommandent-ils ?",
        options: { a: "Que chaque travailleur gère sa propre santé mentale", b: "Des mesures prises par les institutions, pas seulement les individus", c: "Changer de carrière après 5 ans", d: "Réduire le contact avec les bénéficiaires" },
        answer: 'b',
        explanation: "Les experts recommandent « des mesures préventives institutionnelles ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'économie',
        question: "Lisez cette lettre : « Nous accusons réception de votre dossier de prêt immobilier. Après analyse, nous sommes au regret de vous informer que votre demande a été refusée. Ce refus est motivé par un ratio d'endettement supérieur à 40 %, critère au-delà duquel notre établissement ne peut accorder de financement. »\n\nPourquoi la demande de prêt a-t-elle été refusée ?",
        options: { a: "Le client n'a pas fourni tous les documents", b: "Le montant demandé était trop élevé", c: "Le taux d'endettement dépasse le seuil acceptable", d: "La banque a fermé ce service" },
        answer: 'c',
        explanation: "La lettre indique un « ratio d'endettement supérieur à 40 % ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'environnement',
        question: "Lisez cet article : « Le Québec s'est engagé à réduire ses émissions de gaz à effet de serre de 37,5 % sous le niveau de 1990, d'ici 2030. Le gouvernement mise sur l'électrification des transports, l'efficacité énergétique des bâtiments, et la transition vers une économie circulaire. Ces objectifs nécessiteront des investissements estimés à 43 milliards de dollars. »\n\nQuel est l'un des axes de la stratégie climatique du Québec ?",
        options: { a: "L'augmentation de la production pétrolière", b: "L'électrification des transports", c: "La construction de centrales thermiques", d: "La réduction de la population urbaine" },
        answer: 'b',
        explanation: "Le gouvernement mise sur « l'électrification des transports ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'quotidien',
        question: "Lisez ce menu : « Café du Plateau — Menu du midi\n• Soupe du jour + pain : 6 $\n• Sandwich + boisson : 12 $\n• Plat du jour : 15 $\n• Dessert : 5 $\nFormule complète (soupe + plat + dessert) : 22 $ »\n\nCombien coûte la formule complète ?",
        options: { a: "15 $", b: "20 $", c: "22 $", d: "26 $" },
        answer: 'c',
        explanation: "La formule complète (soupe + plat + dessert) est à 22 $.",
      },
      {
        section: 'CE', level: 'B1', theme: 'santé',
        question: "Lisez ce dépliant : « Campagne de vaccination contre la grippe. La vaccination est recommandée pour : les personnes de 75 ans et plus, les femmes enceintes, les personnes atteintes de maladies chroniques, les travailleurs de la santé. Elle est GRATUITE pour ces groupes. Pour les autres : 20 $. »\n\nPour qui le vaccin est-il GRATUIT ?",
        options: { a: "Pour tous les résidents", b: "Uniquement pour les enfants de moins de 5 ans", c: "Pour les groupes prioritaires comme les personnes âgées et les femmes enceintes", d: "Pour les étudiants en santé uniquement" },
        answer: 'c',
        explanation: "Le dépliant liste des groupes prioritaires pour lesquels le vaccin est gratuit.",
      },
      {
        section: 'CE', level: 'B2', theme: 'éducation',
        question: "Lisez cet extrait : « Tout étudiant qui se présente à une évaluation avec un appareil non autorisé, qui consulte des documents non permis, ou qui communique avec d'autres personnes sera considéré en situation de plagiat. Les sanctions vont d'un zéro jusqu'à l'exclusion définitive de l'établissement. »\n\nQuelle est la sanction MAXIMALE ?",
        options: { a: "Un avertissement écrit", b: "Un zéro sur l'examen", c: "Une suspension d'un semestre", d: "L'exclusion définitive de l'établissement" },
        answer: 'd',
        explanation: "Le règlement précise « jusqu'à l'exclusion définitive de l'établissement ».",
      },
      {
        section: 'CE', level: 'C1', theme: 'politique',
        question: "Lisez cet article : « La notion de vivre-ensemble est au cœur des débats sur l'identité québécoise. Pour certains, elle constitue une réponse pragmatique au pluralisme. Pour d'autres, elle masque une asymétrie de pouvoir entre les groupes majoritaires et minoritaires, obligeant ces derniers à adapter leurs pratiques aux normes dominantes. »\n\nQuelle critique est formulée contre le « vivre-ensemble » ?",
        options: { a: "Il ignore les valeurs culturelles locales", b: "Il cache un déséquilibre de pouvoir entre groupes majoritaires et minoritaires", c: "Il favorise l'assimilation des majorités", d: "Il est trop coûteux à mettre en œuvre" },
        answer: 'b',
        explanation: "Les critiques soulignent qu'il « masque une asymétrie de pouvoir fondamentale ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'services',
        question: "Lisez cet avis : « FERMETURE EXCEPTIONNELLE — La piscine municipale Jean-Drapeau sera fermée du 1er au 15 août pour travaux de rénovation. Les abonnés peuvent utiliser la piscine du Complexe sportif Claude-Robillard pendant cette période sans frais supplémentaires. »\n\nPendant la fermeture, où les abonnés peuvent-ils nager ?",
        options: { a: "Ils doivent attendre la réouverture", b: "Au Complexe sportif Claude-Robillard gratuitement", c: "Dans n'importe quelle piscine privée", d: "À la piscine de l'UQAM" },
        answer: 'b',
        explanation: "Les abonnés peuvent utiliser le Complexe Claude-Robillard « sans frais supplémentaires ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'immigration',
        question: "Lisez ce message : « Chers demandeurs, veuillez noter que les délais de traitement des demandes de visa de travail ont été réduits de 6 mois à 8 semaines pour les professions en pénurie. Les secteurs concernés sont : soins infirmiers, génie informatique, construction et restauration. Vérifiez si votre profession figure sur la liste des métiers prioritaires sur notre site. »\n\nQuels secteurs bénéficient de délais réduits ?",
        options: { a: "Droit, médecine et enseignement", b: "Soins infirmiers, génie informatique, construction et restauration", c: "Tous les secteurs sans exception", d: "Uniquement les professions artistiques" },
        answer: 'b',
        explanation: "Les secteurs concernés sont « soins infirmiers, génie informatique, construction et restauration ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'transport',
        question: "Lisez ce règlement : « La STM informe ses usagers que l'utilisation des téléphones mobiles pour appels téléphoniques est autorisée dans le métro mais que le volume doit être maintenu à un niveau raisonnable par respect pour les autres passagers. La musique et les vidéos doivent être écoutées avec des écouteurs. Le non-respect de ces règles peut entraîner une amende de 75 $. »\n\nQue risque-t-on en ne respectant pas ces règles ?",
        options: { a: "Une interdiction d'utiliser le métro", b: "Une amende de 75 $", c: "La confiscation du téléphone", d: "Aucune sanction mentionnée" },
        answer: 'b',
        explanation: "Le règlement précise « une amende de 75 $ ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'logement',
        question: "Lisez cet article : « Le droit au maintien dans les lieux protège les locataires québécois contre les évictions arbitraires. Un propriétaire ne peut reprendre son logement que pour y habiter lui-même, y loger un membre de sa famille proche, ou effectuer des travaux majeurs. Dans tous les cas, il doit respecter un préavis de six mois et peut devoir verser une indemnité au locataire. »\n\nDans quel cas un propriétaire peut-il reprendre son logement ?",
        options: { a: "Quand il veut augmenter le loyer", b: "Pour y habiter lui-même ou y loger un proche", c: "À n'importe quel moment avec un préavis de 30 jours", d: "Seulement avec l'accord du Tribunal du logement" },
        answer: 'b',
        explanation: "Le propriétaire peut reprendre son logement « pour y habiter lui-même, y loger un membre de sa famille proche, ou effectuer des travaux majeurs ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'santé',
        question: "Lisez cet article : « La télémédecine a connu une explosion au Québec depuis 2020. Les consultations médicales en ligne ont augmenté de 400 %. Si ce mode de consultation offre une accessibilité indéniable, les médecins soulignent ses limites : impossibilité d'effectuer un examen physique, risque de sous-diagnostic pour des affections nécessitant une palpation ou une auscultation, et fracture numérique affectant les personnes âgées. »\n\nQuelle est une limite de la télémédecine selon les médecins ?",
        options: { a: "Elle est trop coûteuse pour les patients", b: "Elle ne peut pas remplacer l'examen physique", c: "Elle est interdite pour les médecins de famille", d: "Elle ne fonctionne pas en zone rurale" },
        answer: 'b',
        explanation: "Les médecins soulignent « l'impossibilité d'effectuer un examen physique ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'emploi',
        question: "Lisez cette offre : « AIDE-CUISINIER(ÈRE) — Restaurant La Belle Province, Laval. Temps partiel, 25h/semaine. Horaire : soir et week-end. Salaire : 18 $/heure. Expérience non requise, formation assurée. Envoyez votre CV à emploi@labelleprovince.ca »\n\nL'expérience est-elle nécessaire pour ce poste ?",
        options: { a: "Oui, 2 ans minimum", b: "Non, une formation est assurée", c: "Seulement si vous êtes cuisinier professionnel", d: "L'annonce ne le mentionne pas" },
        answer: 'b',
        explanation: "L'annonce précise « expérience non requise, formation assurée ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'famille',
        question: "Lisez ce document : « L'allocation canadienne pour enfants (ACE) est un paiement mensuel non imposable versé aux familles admissibles pour aider à couvrir les dépenses liées à l'éducation des enfants de moins de 18 ans. Le montant varie selon le revenu familial net, le nombre d'enfants et leur âge. Les nouveaux résidents permanents peuvent y être admissibles après avoir produit leur déclaration de revenus. »\n\nQui peut bénéficier de l'ACE ?",
        options: { a: "Uniquement les citoyens canadiens de naissance", b: "Les familles admissibles, y compris les résidents permanents après leur déclaration de revenus", c: "Seulement les familles avec plus de 3 enfants", d: "Les résidents temporaires avec un permis de travail" },
        answer: 'b',
        explanation: "Les résidents permanents peuvent y être admissibles après leur déclaration de revenus.",
      },
      {
        section: 'CE', level: 'B2', theme: 'technologie',
        question: "Lisez cet article : « La Ville de Montréal a lancé son plan d'action numérique 2023-2027, qui prévoit d'ouvrir gratuitement l'accès à l'internet haute vitesse dans tous les parcs et espaces publics de la métropole. Ce projet vise à réduire la fracture numérique qui touche particulièrement les personnes âgées et les familles à faibles revenus. Un budget de 45 millions de dollars a été alloué. »\n\nQuel est le principal objectif de ce plan numérique ?",
        options: { a: "Promouvoir les entreprises technologiques montréalaises", b: "Réduire la fracture numérique notamment chez les personnes âgées et familles à faibles revenus", c: "Remplacer les lignes téléphoniques fixes", d: "Installer des caméras de surveillance dans les parcs" },
        answer: 'b',
        explanation: "Le plan vise à « réduire la fracture numérique qui touche particulièrement les personnes âgées et les familles à faibles revenus ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'banque',
        question: "Lisez cet avis : « Madame, Monsieur, votre carte de débit expire le 30 novembre. Une nouvelle carte vous sera automatiquement envoyée à votre adresse postale dans les 10 jours ouvrables. Votre NIP actuel sera conservé. Si vous n'avez pas reçu votre nouvelle carte d'ici le 25 novembre, veuillez contacter le service à la clientèle au 1-800-465-3990. »\n\nQue doit-on faire si on ne reçoit pas la nouvelle carte avant le 25 novembre ?",
        options: { a: "Aller à la succursale le 30 novembre", b: "Commander une nouvelle carte en ligne", c: "Contacter le service à la clientèle au numéro indiqué", d: "Ne rien faire, la carte sera prolongée automatiquement" },
        answer: 'c',
        explanation: "L'avis demande de « contacter le service à la clientèle au 1-800-465-3990 ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'droits',
        question: "Lisez ce texte : « Au Québec, tout employé peut refuser d'effectuer un travail s'il a des motifs raisonnables de croire que ce travail l'expose à un danger pour sa santé, sa sécurité ou son intégrité physique. Ce droit de refus est prévu par la Loi sur la santé et la sécurité du travail. L'employeur ne peut pas congédier ou pénaliser un employé qui exerce ce droit de bonne foi. »\n\nDans quelle condition un employé peut-il refuser un travail ?",
        options: { a: "S'il n'aime pas la tâche demandée", b: "S'il estime le salaire insuffisant", c: "S'il a des raisons de croire que le travail met sa santé en danger", d: "S'il est fatigué ou stressé" },
        answer: 'c',
        explanation: "L'employé peut refuser s'il a « des motifs raisonnables de croire que ce travail l'expose à un danger ».",
      },
      {
        section: 'CE', level: 'C1', theme: 'littérature',
        question: "Lisez cet extrait critique : « L'œuvre de Gabrielle Roy occupe une place centrale dans la littérature québécoise. Son roman Bonheur d'occasion, publié en 1945, marque une rupture avec le roman de la terre en portant son regard sur la misère urbaine du quartier Saint-Henri à Montréal. La romancière y dépeint avec une sensibilité réaliste les aspirations et les désillusions d'une famille ouvrière pendant la Seconde Guerre mondiale, inaugurant ainsi le roman social québécois. »\n\nEn quoi Bonheur d'occasion représente-t-il une rupture dans la littérature québécoise ?",
        options: { a: "C'est le premier roman écrit en français au Québec", b: "Il abandonne le thème rural pour se concentrer sur la misère urbaine", c: "Il est le premier roman québécois traduit en anglais", d: "Il inaugure le roman policier québécois" },
        answer: 'b',
        explanation: "L'œuvre marque une rupture en abandonnant le roman de la terre pour « la misère urbaine du quartier Saint-Henri ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'travail',
        question: "Lisez cet article : « Le salaire minimum au Québec sera porté à 16,10 $ l'heure à compter du 1er mai. Cette hausse de 0,65 $ représente une augmentation de 4,2 %. Cependant, les économistes débattent de son impact réel : si elle améliore le pouvoir d'achat des travailleurs à faibles revenus, elle peut aussi entraîner une réduction des heures de travail ou des suppressions de postes dans les petites entreprises. »\n\nQuel effet négatif potentiel du salaire minimum les économistes mentionnent-ils ?",
        options: { a: "Une inflation incontrôlable", b: "Une réduction des heures ou des suppressions de postes", c: "Une fuite des capitaux étrangers", d: "Une augmentation des importations" },
        answer: 'b',
        explanation: "Les économistes mentionnent « une réduction des heures de travail ou des suppressions de postes ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'bibliothèque',
        question: "Lisez cet avis : « La bibliothèque de Verdun informe ses membres que la durée de prêt des livres est de 3 semaines, renouvelable une fois en ligne. Les DVD peuvent être empruntés pour 7 jours, sans renouvellement possible. Des frais de retard de 0,25 $ par jour s'appliquent aux documents rendus en retard. »\n\nCombien de temps peut-on emprunter un DVD ?",
        options: { a: "7 jours, sans renouvellement", b: "14 jours, renouvelable", c: "3 semaines", d: "1 mois" },
        answer: 'a',
        explanation: "Les DVD peuvent être empruntés « pour 7 jours, sans renouvellement possible ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'environnement',
        question: "Lisez ce communiqué : « La collecte des déchets organiques est maintenant obligatoire pour tous les résidents de Montréal. Le bac brun doit être sorti chaque semaine, le lundi matin avant 7h. Y mettre : restes de nourriture, coquilles d'œufs, marc de café, papier essuie-tout souillé. Ne pas y mettre : plastique, métal, verre. Des amendes de 100 à 500 $ peuvent être imposées aux contrevenants. »\n\nQuand doit-on sortir le bac brun ?",
        options: { a: "Le dimanche soir avant minuit", b: "Le lundi matin avant 7h", c: "Deux fois par semaine", d: "Uniquement aux deux semaines" },
        answer: 'b',
        explanation: "Le communiqué précise « le lundi matin avant 7h ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'immigration',
        question: "Lisez cet article : « Le Programme de l'expérience québécoise (PEQ) permet aux travailleurs temporaires et aux diplômés d'établissements québécois d'obtenir la résidence permanente de façon accélérée. Contrairement aux autres programmes, le PEQ ne comporte pas de tirage au sort ni de score minimum requis si les critères de base sont remplis. Il exige toutefois une connaissance du français correspondant au niveau B2 du cadre européen. »\n\nQu'est-ce qui distingue le PEQ des autres programmes d'immigration ?",
        options: { a: "Il est ouvert à tous les immigrants sans critères", b: "Il ne comporte pas de tirage au sort si les critères de base sont remplis", c: "Il est réservé aux médecins et ingénieurs", d: "Il n'exige pas de test de langue" },
        answer: 'b',
        explanation: "Le PEQ « ne comporte pas de tirage au sort ni de score minimum requis si les critères de base sont remplis ».",
      },
      {
        section: 'CE', level: 'C1', theme: 'économie',
        question: "Lisez cet éditorial : « La transition énergétique québécoise se heurte à une contradiction fondamentale : si l'hydroélectricité d'Hydro-Québec constitue un avantage concurrentiel indéniable dans la lutte contre les émissions carbonées, l'expansion des capacités de production nécessite l'inondation de territoires ancestraux autochtones, soulevant des questions éthiques et juridiques que l'urgence climatique ne saurait effacer. »\n\nQuelle contradiction l'auteur soulève-t-il ?",
        options: { a: "L'hydroélectricité est trop coûteuse pour les consommateurs", b: "L'expansion de l'hydroélectricité nécessite l'inondation de territoires autochtones, soulevant des enjeux éthiques", c: "Hydro-Québec est contre la transition énergétique", d: "Le Québec manque de ressources hydroélectriques" },
        answer: 'b',
        explanation: "L'expansion nécessite « l'inondation de territoires ancestraux autochtones, soulevant des questions éthiques et juridiques ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'logement',
        question: "Lisez ce contrat : « Le locataire doit aviser le propriétaire par écrit au moins 3 mois avant la fin du bail s'il ne désire pas le renouveler. À défaut d'un tel avis, le bail est reconduit automatiquement aux mêmes conditions pour la même durée, ou pour une durée de 12 mois si le bail initial était de moins de 12 mois. »\n\nQue se passe-t-il si le locataire n'avise pas le propriétaire à temps ?",
        options: { a: "Il doit quitter le logement immédiatement", b: "Le bail est renouvelé automatiquement", c: "Il perd son dépôt de garantie", d: "Le propriétaire peut augmenter le loyer librement" },
        answer: 'b',
        explanation: "« Le bail est reconduit automatiquement aux mêmes conditions ».",
      },
      {
        section: 'CE', level: 'A2', theme: 'pharmacie',
        question: "Lisez cette ordonnance : « Patient : Marc Bouchard. Médicament : Amoxicilline 500mg. Posologie : 1 comprimé 3 fois par jour pendant 10 jours. Prendre avec de la nourriture. Ne pas consommer d'alcool. Médecin : Dr. Christine Lapointe. »\n\nCombien de comprimés le patient doit-il prendre par jour ?",
        options: { a: "1 comprimé par jour", b: "2 comprimés par jour", c: "3 comprimés par jour", d: "1 comprimé toutes les 8 heures" },
        answer: 'c',
        explanation: "La posologie indique « 1 comprimé 3 fois par jour ».",
      },
      {
        section: 'CE', level: 'B1', theme: 'assurance',
        question: "Lisez ce document : « Votre police d'assurance automobile couvre : les dommages causés à autrui (responsabilité civile, obligatoire), les dommages à votre propre véhicule (collision, optionnel), le vol et le vandalisme (optionnel), les accidents sans collision (optionnel). Le franchises applicable est de 500 $ pour la collision. »\n\nQuelle couverture est OBLIGATOIRE selon cette police ?",
        options: { a: "La couverture collision", b: "La couverture vol et vandalisme", c: "La responsabilité civile", d: "La couverture sans collision" },
        answer: 'c',
        explanation: "La responsabilité civile est indiquée comme « obligatoire ».",
      },
      {
        section: 'CE', level: 'B2', theme: 'société',
        question: "Lisez cet article : « L'itinérance visible a augmenté de 44 % à Montréal entre 2018 et 2022, selon le dénombrement réalisé par la Ville. Les facteurs explicatifs sont multiples : crise du logement, insuffisance des ressources en santé mentale, impacts de la pandémie sur les revenus précaires. Les organismes communautaires réclament un plan d'action gouvernemental chiffré et assorti d'échéances précises. »\n\nQuelle est la principale demande des organismes communautaires ?",
        options: { a: "Construire plus de refuges temporaires", b: "Un plan d'action gouvernemental chiffré avec des échéances précises", c: "Interdire l'itinérance dans les espaces publics", d: "Augmenter la police de proximité" },
        answer: 'b',
        explanation: "Les organismes réclament « un plan d'action gouvernemental chiffré et assorti d'échéances précises ».",
      },
      {
        section: 'CE', level: 'C1', theme: 'droits',
        question: "Lisez cet extrait juridique : « La Charte des droits et libertés de la personne du Québec interdit toute discrimination fondée notamment sur la race, la couleur, le sexe, la grossesse, l'orientation sexuelle, l'état civil, l'âge (sauf dans la mesure prévue par la loi), la religion, les convictions politiques, la langue, l'origine ethnique ou nationale, la condition sociale, le handicap ou l'utilisation d'un moyen pour pallier ce handicap. »\n\nSelon la Charte québécoise, lequel de ces critères est protégé sous conditions ?",
        options: { a: "La race", b: "La religion", c: "L'âge (sauf dans la mesure prévue par la loi)", d: "La langue" },
        answer: 'c',
        explanation: "L'âge est protégé « sauf dans la mesure prévue par la loi », ce qui indique une protection conditionnelle.",
      },

];

// ═══════════════════════════════════════════════════════════
// EE — EXPRESSION ÉCRITE (6 sessions × 3 tâches)
// ═══════════════════════════════════════════════════════════
const EE_QUESTIONS = [
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nVous venez d'emménager dans un nouvel appartement. Écrivez un message à votre voisin(e) du dessus pour lui signaler que le robinet de votre salle de bain coule et que vous entendez de l'eau couler chez vous depuis ce matin. Soyez poli(e) et demandez-lui de vérifier.",
        explanation: "Critères : message clair, politesse, description du problème, contact ou demande d'action.",
      },
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez votre première semaine dans votre nouveau logement au Québec. Décrivez votre quartier, les personnes que vous avez rencontrées, et une situation inattendue ou amusante que vous avez vécue. Utilisez le passé composé et l'imparfait.",
        explanation: "Critères : narration au passé, description du contexte, événement raconté avec détails, connecteurs temporels.",
      },
      {
        section: 'EE', level: 'B1', theme: 'logement',
        sessionGroup: 'ee-b1-logement-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « La colocation permet aux nouveaux arrivants de réduire leurs dépenses et de tisser des liens sociaux rapidement. C'est la solution idéale pour s'intégrer. »\nDocument 2 (Contre) : « La colocation génère des conflits liés aux différences culturelles et au manque d'intimité. Elle n'est pas adaptée aux familles. »\n\nRédigez un texte en deux parties : résumez les deux documents, puis donnez votre opinion personnelle sur la colocation pour les immigrants.",
        explanation: "Critères : structure en deux parties, résumé objectif des deux positions, connecteur d'opposition, opinion personnelle argumentée.",
      },
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nVous avez un entretien d'embauche demain matin mais votre réveil est cassé. Écrivez un message à un(e) ami(e) pour lui demander de vous appeler à 7h du matin pour vous réveiller, en expliquant brièvement la raison.",
        explanation: "Critères : demande claire, explication de la raison, ton amical approprié.",
      },
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez votre première journée à un nouveau travail (réel ou imaginaire). Décrivez vos collègues, l'ambiance, ce que vous avez fait, et comment vous vous êtes senti(e) à la fin de la journée.",
        explanation: "Critères : récit au passé, description de l'environnement de travail, expression des émotions, chronologie claire.",
      },
      {
        section: 'EE', level: 'B1', theme: 'travail',
        sessionGroup: 'ee-b1-travail-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « Le télétravail améliore la qualité de vie des employés en éliminant les longs trajets et en offrant plus de flexibilité. Les entreprises qui l'adoptent voient leur productivité augmenter. »\nDocument 2 (Contre) : « Le télétravail isole les employés, nuit à la collaboration et rend la frontière entre vie professionnelle et vie privée très difficile à maintenir. »\n\nRésumez les deux points de vue, puis exprimez votre opinion personnelle sur le télétravail.",
        explanation: "Critères : deux parties distinctes, résumé objectif, connecteur d'opposition, prise de position argumentée.",
      },
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nVous êtes responsable d'une association de quartier. Rédigez un message pour inviter les résidents à une réunion concernant l'aménagement d'un nouveau parc dans votre quartier. Précisez la date, l'heure, le lieu et l'importance de leur participation.",
        explanation: "Critères : ton semi-formel, informations complètes (qui, quoi, quand, où), appel à la participation.",
      },
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez un événement dans lequel vous avez aidé quelqu'un dans votre communauté (voisin, immigrant nouvellement arrivé, personne âgée, etc.). Décrivez la situation, ce que vous avez fait, et ce que cette expérience vous a apporté.",
        explanation: "Critères : récit structuré, détails concrets, expression des émotions et de la réflexion personnelle.",
      },
      {
        section: 'EE', level: 'B2', theme: 'société',
        sessionGroup: 'ee-b2-societe-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « Les réseaux sociaux sont des outils indispensables pour les immigrants : ils permettent de maintenir des liens avec la famille restée au pays et de s'intégrer plus rapidement à la communauté locale. »\nDocument 2 (Contre) : « Les réseaux sociaux créent une illusion de communauté et maintiennent les immigrants dans une bulle culturelle qui freine leur intégration réelle. »\n\nRésumez les deux perspectives et donnez votre point de vue personnel.",
        explanation: "Critères : résumé équilibré des deux positions, connecteur d'opposition clair, opinion personnelle développée.",
      },
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nVotre enfant a été absent de l'école pendant 3 jours à cause de la grippe. Il est maintenant guéri et reprend l'école demain. Écrivez une note pour son enseignant(e) pour expliquer l'absence et informer que votre enfant peut reprendre ses activités normalement.",
        explanation: "Critères : ton adapté (semi-formel), explication de l'absence, information sur le retour.",
      },
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez une expérience d'apprentissage marquante : une fois où vous avez appris quelque chose d'important (une langue, une compétence, une leçon de vie). Décrivez les circonstances, le processus d'apprentissage, et ce que cela a changé dans votre vie.",
        explanation: "Critères : récit au passé, description du processus, réflexion sur l'impact de l'expérience.",
      },
      {
        section: 'EE', level: 'B2', theme: 'éducation',
        sessionGroup: 'ee-b2-education-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « Les écoles devraient enseigner le code informatique dès le primaire. Dans un monde de plus en plus numérique, cette compétence est aussi fondamentale que lire et écrire. »\nDocument 2 (Contre) : « Enseigner le code au primaire se fait au détriment d'autres matières essentielles. Les enfants ont surtout besoin de développer leur créativité, leur sens critique et leurs compétences sociales. »\n\nRésumez les deux positions et exprimez votre opinion sur l'enseignement du code à l'école primaire.",
        explanation: "Critères : résumé des deux positions, connecteur d'opposition, opinion personnelle argumentée avec exemples.",
      },
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nVous ne pouvez pas aller au rendez-vous prévu avec votre ami(e) François demain. Envoyez-lui un SMS pour annuler et proposer un autre jour de la même semaine.",
        explanation: "Critères : ton amical, explication simple, proposition alternative.",
      },
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez votre premier jour au Québec. Décrivez ce que vous avez vu en arrivant, comment vous vous sentiez, et une chose qui vous a surpris(e) ou impressionné(e).",
        explanation: "Critères : récit au passé, description du contexte, expression des émotions, détails concrets.",
      },
      {
        section: 'EE', level: 'A2', theme: 'quotidien',
        sessionGroup: 'ee-a2-quotidien-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « Cuisiner chez soi est bien meilleur pour la santé et le budget. On contrôle les ingrédients et on mange mieux pour moins cher. »\nDocument 2 (Contre) : « Dans nos vies modernes très occupées, les restaurants et la livraison à domicile sont indispensables. Ils font gagner du temps et permettent de découvrir de nouvelles cuisines. »\n\nRésumez les deux points de vue et donnez votre opinion personnelle.",
        explanation: "Critères : résumé simple des deux positions, connecteur d'opposition, opinion personnelle avec exemples de votre vie.",
      },
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 1,
        wordCountMin: 60, wordCountMax: 120, timeLimitMin: 10,
        question: "Tâche 1 — Message court (60-120 mots)\n\nEn tant que représentant(e) d'une association étudiante, rédigez un court message pour la newsletter de votre université afin d'annoncer une conférence sur l'intelligence artificielle et l'avenir du travail. Donnez les informations clés et encouragez la participation.",
        explanation: "Critères : registre semi-formel, informations complètes, ton engageant et professionnel.",
      },
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 2,
        wordCountMin: 120, wordCountMax: 150, timeLimitMin: 20,
        question: "Tâche 2 — Narration (120-150 mots)\n\nRacontez un moment où vous avez dû surmonter un obstacle culturel significatif dans votre vie au Québec (une incompréhension, une différence de valeurs, une situation embarrassante). Que vous a appris cette expérience ?",
        explanation: "Critères : récit structuré avec contexte, événement précis, réflexion approfondie sur les enseignements tirés.",
      },
      {
        section: 'EE', level: 'C1', theme: 'société',
        sessionGroup: 'ee-c1-enjeux-01', taskNumber: 3,
        wordCountMin: 120, wordCountMax: 180, timeLimitMin: 30,
        question: "Tâche 3 — Texte argumentatif (120-180 mots)\n\nDocument 1 (Pour) : « L'immigration massive est la solution aux défis démographiques des pays développés. Elle compense le vieillissement de la population, stimule l'économie et enrichit la culture. »\nDocument 2 (Contre) : « Une immigration non maîtrisée crée des tensions sociales, exerce une pression sur les services publics et nuit à la cohésion nationale. Il faut une approche sélective et progressive. »\n\nRésumez les deux points de vue opposés, puis défendez votre position personnelle en vous appuyant sur des arguments précis.",
        explanation: "Critères : résumé équilibré et objectif, connecteur d'opposition, position personnelle nuancée, argumentation développée, registre soutenu.",
      },

];

// ═══════════════════════════════════════════════════════════
// EO — EXPRESSION ORALE (5 sessions × 3 tâches)
// ═══════════════════════════════════════════════════════════
const EO_QUESTIONS = [
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 1, timeLimitMin: 3,
        imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600',
        question: "Tâche 1 — Décrire et réagir à une image (2-3 minutes)\n\nRegardez cette image : une famille avec des valises dans un aéroport, devant un panneau indiquant « Bienvenue au Canada ».\n\nDécrivez ce que vous voyez. Imaginez qui sont ces personnes et d'où elles viennent. Comment pensez-vous qu'elles se sentent ? Qu'est-ce qui les attend selon vous ?",
        explanation: "Critères : description organisée, imagination créative, expression des émotions, vocabulaire de l'immigration.",
      },
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 2, timeLimitMin: 3,
        question: "Tâche 2 — Défendre un point de vue (2-3 minutes)\n\nL'examinateur(trice) vous soumet : « S'adapter à une nouvelle culture, c'est forcément perdre une partie de son identité. »\n\nExprimez votre opinion. Développez votre réponse avec au moins deux arguments et des exemples personnels.",
        explanation: "Critères : position claire, arguments structurés, exemples pertinents, interaction avec l'affirmation.",
      },
      {
        section: 'EO', level: 'B1', theme: 'immigration',
        sessionGroup: 'eo-b1-immigration-01', taskNumber: 3, timeLimitMin: 4,
        question: "Tâche 3 — Simulation d'interaction (3-4 minutes)\n\nVous appelez le service d'aide aux immigrants pour vous renseigner sur la reconnaissance de votre diplôme étranger en soins infirmiers. L'examinateur joue le conseiller.\n\nPosez vos questions, exprimez vos préoccupations et réagissez aux informations.",
        explanation: "Critères : initiative conversationnelle, questions pertinentes, écoute active, registre formel.",
      },
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 1, timeLimitMin: 3,
        imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600',
        question: "Tâche 1 — Réagir à un document (2-3 minutes)\n\nVous voyez une offre d'emploi : « COORDINATEUR(TRICE) D'ÉVÉNEMENTS bilingue. Salaire : 45 000-50 000 $/an. 2 ans d'expérience. Télétravail 3j/semaine. »\n\nPrésentez les points positifs et négatifs de cette offre. Ce poste vous conviendrait-il ? Que demanderiez-vous en entretien ?",
        explanation: "Critères : analyse structurée, opinion personnelle argumentée, questions d'entretien pertinentes.",
      },
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 2, timeLimitMin: 3,
        question: "Tâche 2 — Défendre un point de vue (2-3 minutes)\n\n« Il vaut mieux accepter n'importe quel emploi quand on arrive dans un nouveau pays, même si ce n'est pas dans son domaine. »\n\nÊtes-vous d'accord ? Développez votre réponse avec des arguments et des exemples.",
        explanation: "Critères : position nuancée possible, arguments équilibrés, exemples concrets, fluidité.",
      },
      {
        section: 'EO', level: 'B1', theme: 'travail',
        sessionGroup: 'eo-b1-travail-01', taskNumber: 3, timeLimitMin: 4,
        question: "Tâche 3 — Simulation : entretien téléphonique (3-4 minutes)\n\nUne entreprise vous rappelle suite à votre candidature pour un poste de commis comptable. L'examinateur joue le recruteur. Il va vous poser des questions sur votre expérience et vos attentes.\n\nRépondez et posez au moins deux questions sur le poste.",
        explanation: "Critères : présentation professionnelle, réponses précises, questions pertinentes, registre formel.",
      },
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 1, timeLimitMin: 4,
        imageUrl: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600',
        question: "Tâche 1 — Analyser un document (3-4 minutes)\n\nVous voyez un graphique montrant que le Québec a accueilli 60 000 immigrants en 2022 contre 35 000 en 2010. Les 5 principaux pays d'origine : France, Algérie, Maroc, Cameroun, Haïti.\n\nCommentez : que montre ce graphique ? Quelles tendances observez-vous ? Quels sont les enjeux pour la société québécoise ?",
        explanation: "Critères : lecture de données, analyse causale, vocabulaire statistique, structure du commentaire.",
      },
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 2, timeLimitMin: 4,
        question: "Tâche 2 — Défendre un point de vue (3-4 minutes)\n\n« Le Québec devrait imposer des quotas stricts sur l'immigration pour préserver son identité culturelle et francophone. »\n\nDonnez votre opinion argumentée. Prenez en compte les enjeux démographiques, économiques et culturels.",
        explanation: "Critères : argumentation structurée et nuancée, données ou exemples précis, registre soutenu.",
      },
      {
        section: 'EO', level: 'B2', theme: 'société',
        sessionGroup: 'eo-b2-societe-01', taskNumber: 3, timeLimitMin: 5,
        question: "Tâche 3 — Simulation : réunion de quartier (4-5 minutes)\n\nUn promoteur immobilier veut construire une tour de condos à la place du parc de votre quartier. L'examinateur joue l'animateur et un voisin favorable au projet.\n\nExprimez votre opposition, argumentez, répondez aux contre-arguments et proposez une alternative.",
        explanation: "Critères : argumentation en temps réel, capacité de réfutation, écoute, richesse lexicale.",
      },
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 1, timeLimitMin: 4,
        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
        question: "Tâche 1 — Décrire et commenter une image (3-4 minutes)\n\nVous voyez une salle de classe universitaire où des étudiants de différentes origines travaillent ensemble, avec des drapeaux de divers pays.\n\nDécrivez l'image. Que représente-t-elle ? Quel message véhicule-t-elle ? La diversité est-elle un atout ou un défi dans ce contexte ?",
        explanation: "Critères : description précise, interprétation symbolique, développement sur la diversité.",
      },
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 2, timeLimitMin: 4,
        question: "Tâche 2 — Défendre un point de vue (3-4 minutes)\n\n« Maîtriser parfaitement le français est la condition sine qua non d'une intégration réussie au Québec. »\n\nDiscutez de cette affirmation. Y a-t-il d'autres facteurs aussi importants ? Donnez des exemples.",
        explanation: "Critères : déconstruction de l'affirmation, exemples variés, nuance et profondeur.",
      },
      {
        section: 'EO', level: 'B2', theme: 'culture',
        sessionGroup: 'eo-b2-culture-01', taskNumber: 3, timeLimitMin: 5,
        question: "Tâche 3 — Demande d'information (4-5 minutes)\n\nVous voulez vous inscrire à des cours de francisation gratuits du gouvernement du Québec. L'examinateur joue l'agent du Ministère de l'Immigration.\n\nPosez des questions sur les critères d'admissibilité, les horaires, la durée, les niveaux et les certificats obtenus.",
        explanation: "Critères : questions pertinentes et progressives, vocabulaire administratif, compréhension des réponses.",
      },
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 1, timeLimitMin: 2,
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600',
        question: "Tâche 1 — Décrire une image simple (1-2 minutes)\n\nVous voyez une photo d'un marché en plein air avec des fruits et légumes colorés, des vendeurs et des clients.\n\nDécrivez ce que vous voyez : les couleurs, les personnes, ce qui se passe. Aimez-vous faire vos courses dans ce type de marché ?",
        explanation: "Critères : description simple, vocabulaire du marché, expression d'une opinion simple.",
      },
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 2, timeLimitMin: 2,
        question: "Tâche 2 — Répondre à une question (1-2 minutes)\n\n« Décrivez votre journée typique depuis votre arrivée au Québec. Qu'est-ce qui est différent de votre pays d'origine ? »\n\nRépondez avec des exemples concrets de votre vie quotidienne.",
        explanation: "Critères : description chronologique simple, vocabulaire quotidien, comparaison simple entre deux contextes.",
      },
      {
        section: 'EO', level: 'A2', theme: 'quotidien',
        sessionGroup: 'eo-a2-quotidien-01', taskNumber: 3, timeLimitMin: 3,
        question: "Tâche 3 — Simulation : au supermarché (2-3 minutes)\n\nVous êtes au supermarché et ne trouvez pas le rayon des produits laitiers. L'examinateur joue un employé.\n\nDemandez où se trouve le rayon, demandez l'heure de fermeture et si le magasin accepte les paiements par carte.",
        explanation: "Critères : politesse, questions claires, structures interrogatives de base.",
      },

];

// ═══════════════════════════════════════════════════════════
// SEED — logique non-destructive
// CO  : efface uniquement la série ciblée puis réinsère
// CE/EE/EO : insère seulement si la section est vide
//            → les questions ajoutées via l'admin sont préservées
// ═══════════════════════════════════════════════════════════
async function seed() {
  console.log('🌱 Seeding TCF Canada — mode non-destructif...');

  // ── CO : refresh de la série 1 uniquement ──────────────────
  const coSeries = [...new Set(CO_QUESTIONS.map((q: any) => q.sessionGroup).filter(Boolean))];
  for (const sg of coSeries) {
    await prisma.question.deleteMany({ where: { section: 'CO', sessionGroup: sg } });
  }
  await prisma.question.createMany({ data: CO_QUESTIONS as any[] });
  const coCount = await prisma.question.count({ where: { section: 'CO' } });
  console.log(`  ✅ CO : ${coCount} questions (série(s) ${coSeries.join(', ')} rechargée(s))`);

  // ── CE : insère uniquement si vide ─────────────────────────
  const ceExisting = await prisma.question.count({ where: { section: 'CE' } });
  if (ceExisting === 0) {
    await prisma.question.createMany({ data: CE_QUESTIONS as any[] });
    console.log(`  ✅ CE : ${CE_QUESTIONS.length} questions insérées (banque vide)`);
  } else {
    console.log(`  ⏭  CE : ${ceExisting} questions existantes préservées — utilisez l'admin pour modifier`);
  }

  // ── EE : insère uniquement si vide ─────────────────────────
  const eeExisting = await prisma.question.count({ where: { section: 'EE' } });
  if (eeExisting === 0) {
    await prisma.question.createMany({ data: EE_QUESTIONS as any[] });
    console.log(`  ✅ EE : ${EE_QUESTIONS.length} questions insérées (banque vide)`);
  } else {
    console.log(`  ⏭  EE : ${eeExisting} questions existantes préservées — utilisez l'admin pour modifier`);
  }

  // ── EO : insère uniquement si vide ─────────────────────────
  const eoExisting = await prisma.question.count({ where: { section: 'EO' } });
  if (eoExisting === 0) {
    await prisma.question.createMany({ data: EO_QUESTIONS as any[] });
    console.log(`  ✅ EO : ${EO_QUESTIONS.length} questions insérées (banque vide)`);
  } else {
    console.log(`  ⏭  EO : ${eoExisting} questions existantes préservées — utilisez l'admin pour modifier`);
  }

  const total = await prisma.question.count();
  console.log(`\n✅ Total : ${total} questions en base.`);
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
