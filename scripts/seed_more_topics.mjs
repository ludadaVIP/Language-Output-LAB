import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = path.join(ROOT, "data", "topics");

function slugify(value) {
  return String(value || "topic")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "topic";
}

const modules = [
  {
    language: "es",
    skill: "speaking",
    start: 1,
    topics: [
      {
        category: "Vida cotidiana",
        title: "Tu barrio ideal",
        prompt: "Habla de cómo sería tu barrio ideal. Describe los servicios, el ambiente y las cosas que te gustaría tener cerca.",
        format: "Respuesta oral · 2-3 minutos",
        levelRange: "B1 - B2",
        examples: [
          {
            level: "B1",
            title: "Un barrio cómodo",
            body: "Mi barrio ideal sería tranquilo, pero no demasiado lejos del centro. Me gustaría tener un supermercado, una farmacia y una parada de metro cerca de casa.\n\nTambién sería importante tener parques, porque me gusta caminar después del trabajo. Si hubiera cafeterías pequeñas y una biblioteca, sería perfecto para mí."
          },
          {
            level: "B2",
            title: "Un lugar con vida propia",
            body: "Para mí, el barrio ideal no es necesariamente el más elegante, sino aquel en el que se puede vivir con comodidad y sentir cierta pertenencia. Necesitaría buenos servicios, transporte público frecuente y espacios verdes donde desconectar.\n\nAdemás, valoraría mucho que hubiera comercio local: panaderías, librerías, mercados y cafeterías donde la gente se conoce. Esa mezcla de utilidad y vida comunitaria haría que el barrio resultara realmente acogedor."
          }
        ]
      },
      {
        category: "Experiencias",
        title: "Una decisión importante",
        prompt: "Cuenta una decisión importante que tomaste. Explica la situación, las opciones y cómo te sientes ahora.",
        format: "Monólogo narrativo · 2-3 minutos",
        levelRange: "B1 - B2",
        examples: [
          {
            level: "B1",
            title: "Cambiar de trabajo",
            body: "Hace dos años tomé una decisión importante: cambié de trabajo. Tenía miedo porque mi empleo anterior era seguro, pero no estaba aprendiendo nada nuevo.\n\nAl final acepté una oferta en una empresa más pequeña. Al principio fue difícil, pero ahora estoy contento. Tengo más responsabilidades y siento que he crecido mucho."
          },
          {
            level: "B2",
            title: "Salir de la zona conocida",
            body: "Una de las decisiones que más me ha marcado fue dejar un trabajo estable para empezar en un sector distinto. No se trataba solo de cambiar de oficina, sino de admitir que necesitaba un reto más acorde con mis intereses.\n\nDurante semanas dudé muchísimo, porque la seguridad pesa bastante cuando uno ya tiene responsabilidades. Sin embargo, con el tiempo comprendí que aquella incomodidad inicial era precisamente la señal de que estaba avanzando."
          }
        ]
      },
      {
        category: "Tecnología",
        title: "La tecnología en las clases",
        prompt: "Da tu opinión sobre el uso de tecnología en clase. Menciona ventajas, problemas y una recomendación.",
        format: "Opinión oral · 2 minutos",
        levelRange: "B1 - B2",
        examples: [
          {
            level: "B1",
            title: "Una herramienta útil",
            body: "Creo que la tecnología en clase puede ser muy útil. Por ejemplo, los estudiantes pueden ver vídeos, buscar información y practicar con aplicaciones.\n\nSin embargo, también hay un problema: el móvil distrae mucho. Por eso pienso que el profesor debe decidir cuándo usar la tecnología y cuándo guardar los dispositivos."
          },
          {
            level: "B2",
            title: "Equilibrio antes que entusiasmo",
            body: "La tecnología puede enriquecer muchísimo una clase si se utiliza con un objetivo claro. Permite acceder a materiales auténticos, adaptar actividades al nivel del alumno y practicar de forma más interactiva.\n\nAhora bien, no debería convertirse en una solución automática para todo. Si sustituye la conversación, la concentración o el pensamiento crítico, pierde parte de su valor. La clave está en integrarla con criterio."
          }
        ]
      }
    ]
  },
  {
    language: "en",
    skill: "speaking",
    start: 1,
    topics: [
      {
        category: "Daily life",
        title: "A productive morning",
        prompt: "Talk about what makes a morning productive for you. Include habits, distractions, and one thing you would like to improve.",
        format: "Spoken answer · 2-3 minutes",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "My best mornings",
            body: "A productive morning for me starts with a simple plan. I wake up early, drink some water, and write down the three most important things I need to do.\n\nThe biggest distraction is my phone. If I check messages too early, I lose time. I would like to improve my habit of doing exercise before work."
          },
          {
            level: "C1",
            title: "Protecting the first hour",
            body: "For me, a productive morning depends less on waking up dramatically early and more on protecting the first hour from noise. If I begin the day by reacting to messages, I immediately lose a sense of direction.\n\nWhat works best is a short routine: a clear list, a quiet breakfast, and one focused task before the day becomes fragmented. The habit I still need to strengthen is resisting the false urgency of notifications."
          }
        ]
      },
      {
        category: "Memories",
        title: "A meal you remember",
        prompt: "Describe a meal that you remember clearly. Explain where you were, who you were with, and why it stayed in your mind.",
        format: "Narrative speaking · 2-3 minutes",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "Dinner by the sea",
            body: "One meal I remember was a dinner by the sea with my family. We ate grilled fish, salad, and fresh bread at a small restaurant.\n\nThe food was simple, but the evening was special because everyone was relaxed. We talked for a long time and watched the sunset. I remember it because it felt peaceful."
          },
          {
            level: "C1",
            title: "More than the food",
            body: "The meal that comes back to me most vividly was not remarkable because of the menu, but because of the atmosphere surrounding it. We were sitting outside a modest restaurant near the coast, tired after a long day of travelling.\n\nThere was seafood, bread, and a bottle of local wine, but what I remember most is the unhurried conversation. It was one of those rare evenings when nobody was performing or rushing; we were simply present."
          }
        ]
      },
      {
        category: "Work",
        title: "Working from home",
        prompt: "Give your opinion about working from home. Mention benefits, challenges, and the kind of worker it suits best.",
        format: "Opinion speaking · 2 minutes",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "Comfort and discipline",
            body: "Working from home has many advantages. You save time because you do not travel to the office, and you can organize your day in a more flexible way.\n\nHowever, it can be difficult to separate work and personal life. I think it is best for people who are disciplined and do not need constant contact with colleagues."
          },
          {
            level: "C1",
            title: "Freedom with hidden costs",
            body: "Remote work offers a kind of freedom that many employees understandably value: fewer commutes, more control over the environment, and a better chance of fitting work around ordinary life.\n\nYet that freedom has hidden costs. Boundaries can become blurred, informal learning may disappear, and isolation can grow slowly. In my view, it suits people who are self-directed, but it works best when combined with occasional face-to-face collaboration."
          }
        ]
      }
    ]
  },
  {
    language: "en",
    skill: "writing",
    start: 1,
    topics: [
      {
        category: "Transport",
        title: "Should cities improve public transport?",
        prompt: "Write about why public transport matters in modern cities. Give examples and your opinion.",
        format: "Opinion essay · 180-220 words",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "Better buses, better cities",
            body: "Public transport is very important in big cities. If buses, trains, and underground systems are good, people can move around more easily and spend less money on cars.\n\nThere are also environmental benefits. When more people use public transport, there are fewer cars on the road and less pollution. This is better for everyone, especially children and older people.\n\nIn my opinion, cities should invest more money in clean, safe, and frequent public transport. It should also be affordable, because many workers and students need it every day."
          },
          {
            level: "C1",
            title: "A public system, not a backup plan",
            body: "Public transport should not be treated as a second-class option for people who cannot afford cars. In a well-designed city, it is the backbone of daily movement: efficient, predictable, and accessible to people of different ages and incomes.\n\nInvestment in buses, trains, and cycling connections reduces congestion, improves air quality, and gives residents more freedom. However, quality matters. A system that is unreliable or unsafe will not persuade drivers to change their habits.\n\nFor that reason, cities need long-term planning rather than occasional upgrades. Public transport is not merely a transport issue; it is a question of equality, health, and urban dignity."
          }
        ]
      },
      {
        category: "Education",
        title: "Learning a language as an adult",
        prompt: "Write about the advantages and difficulties of learning a new language as an adult.",
        format: "Reflective essay · 170-220 words",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "Never too late",
            body: "Learning a language as an adult is not always easy, but it is very rewarding. Adults often have clear reasons for studying, such as travel, work, or communication with friends.\n\nThe main difficulty is time. Many adults are busy with jobs and families, so they cannot study every day. They may also feel embarrassed when they make mistakes.\n\nHowever, adults can learn well if they are patient and consistent. In my opinion, the best method is to practise a little every day and use the language in real situations."
          },
          {
            level: "C1",
            title: "Motivation with memory",
            body: "Adults often approach language learning with a seriousness that younger learners may lack. They usually know why they are studying, can connect new vocabulary to real experiences, and are capable of reflecting on their own progress.\n\nAt the same time, adulthood brings obstacles: limited time, fear of sounding foolish, and the frustration of understanding more than one can produce. Progress can feel painfully uneven.\n\nStill, these difficulties do not make adult learning inferior. They simply require a different strategy: frequent exposure, meaningful output, and tolerance for imperfection. A language becomes usable not when it is flawless, but when the learner is willing to live inside it."
          }
        ]
      },
      {
        category: "Technology",
        title: "Screen time and daily life",
        prompt: "Write about how screen time affects daily life. Include both positive and negative points.",
        format: "Balanced essay · 180-220 words",
        levelRange: "B1 - C1",
        examples: [
          {
            level: "B1",
            title: "Useful but tiring",
            body: "Screens are part of modern life. We use them for work, study, shopping, entertainment, and talking to friends. In many ways, they make life easier and faster.\n\nHowever, too much screen time can be a problem. It can make people tired, reduce sleep quality, and take time away from exercise or face-to-face conversations.\n\nI think the solution is not to stop using screens completely. Instead, we should use them with limits. For example, we can turn off notifications, take breaks, and avoid phones before going to bed."
          },
          {
            level: "C1",
            title: "Attention as a scarce resource",
            body: "Screen time is often discussed as if the screen itself were the problem. In reality, the deeper issue is attention. Digital devices give us extraordinary access to information, work tools, entertainment, and relationships, but they also compete constantly for mental space.\n\nThe benefits are undeniable: remote work, online learning, instant communication, and creative tools have expanded what many people can do. Yet the costs are equally real. Constant scrolling can flatten concentration, weaken sleep, and make silence feel uncomfortable.\n\nA healthier relationship with screens requires deliberate boundaries. We need spaces in the day where attention is not being auctioned to the loudest notification."
          }
        ]
      }
    ]
  },
  {
    language: "fr",
    skill: "speaking",
    start: 1,
    topics: [
      {
        category: "Ville",
        title: "Ma ville préférée",
        prompt: "Parlez d'une ville que vous aimez. Décrivez l'ambiance, les lieux importants et ce que vous aimez y faire.",
        format: "Réponse orale · 2 minutes",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Une ville agréable",
            body: "Ma ville préférée est Lyon. J'aime cette ville parce qu'elle est belle et assez grande. Il y a des restaurants, des musées et des parcs.\n\nLe week-end, j'aime me promener dans le centre et boire un café avec mes amis. Pour moi, c'est une ville vivante mais pas trop stressante."
          },
          {
            level: "B1",
            title: "Une ville avec du caractère",
            body: "J'aime beaucoup Lyon parce qu'elle combine plusieurs choses importantes pour moi. C'est une ville historique, avec de beaux quartiers anciens, mais elle reste moderne et pratique.\n\nCe que je préfère, c'est l'ambiance près des quais. On peut marcher, discuter, regarder les gens passer et découvrir de petits restaurants. Je m'y sens à la fois curieux et tranquille."
          }
        ]
      },
      {
        category: "Loisirs",
        title: "Un week-end idéal",
        prompt: "Décrivez votre week-end idéal. Expliquez avec qui vous êtes, ce que vous faites et pourquoi.",
        format: "Monologue · 2 minutes",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Repos et amis",
            body: "Mon week-end idéal commence sans réveil. Le matin, je prends un bon petit déjeuner et je lis un peu.\n\nL'après-midi, je vois des amis. Nous allons au parc ou dans un café. Le soir, je regarde un film à la maison. C'est simple, mais très agréable."
          },
          {
            level: "B1",
            title: "Du temps sans pression",
            body: "Pour moi, un week-end idéal n'a pas besoin d'être exceptionnel. J'aimerais surtout avoir du temps sans pression, sans messages professionnels et sans horaires stricts.\n\nJe commencerais par dormir un peu plus, puis je sortirais marcher dans un quartier que je connais mal. Le soir, je dînerais avec des amis proches. Ce qui compte, c'est la sensation de respirer."
          }
        ]
      },
      {
        category: "Apprentissage",
        title: "Apprendre une langue",
        prompt: "Parlez de votre expérience avec l'apprentissage des langues. Mentionnez les difficultés et les méthodes utiles.",
        format: "Réponse orale · 2-3 minutes",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Petit à petit",
            body: "J'apprends une langue parce que je veux voyager et parler avec plus de personnes. Pour moi, la grammaire est parfois difficile.\n\nJ'aime écouter des dialogues courts et répéter les phrases. Je pense qu'il faut pratiquer un peu chaque jour, même seulement dix minutes."
          },
          {
            level: "B1",
            title: "La régularité aide beaucoup",
            body: "Apprendre une langue demande du temps, mais je trouve cette expérience très positive. La difficulté principale est de parler sans avoir peur de faire des erreurs.\n\nCe qui m'aide le plus, c'est la régularité. J'écoute des podcasts simples, j'écris de petites phrases et j'essaie de réutiliser le vocabulaire dans des situations concrètes. Petit à petit, je gagne en confiance."
          }
        ]
      }
    ]
  },
  {
    language: "fr",
    skill: "writing",
    start: 1,
    topics: [
      {
        category: "Environnement",
        title: "Protéger la planète",
        prompt: "Écrivez un texte sur les gestes simples pour protéger l'environnement.",
        format: "Texte d'opinion · 120-170 mots",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Des gestes simples",
            body: "Pour protéger la planète, on peut faire des choses simples. Par exemple, on peut éteindre la lumière, prendre une douche courte et recycler le papier et le plastique.\n\nOn peut aussi marcher ou prendre le bus quand c'est possible. À mon avis, chaque personne peut aider un peu. Ce n'est pas toujours facile, mais c'est important pour l'avenir."
          },
          {
            level: "B1",
            title: "Changer les habitudes",
            body: "La protection de l'environnement commence souvent par des habitudes quotidiennes. Réduire les déchets, économiser l'eau et utiliser moins la voiture sont des gestes simples mais utiles.\n\nBien sûr, les gouvernements et les entreprises ont une grande responsabilité. Cependant, les citoyens peuvent aussi agir. Quand beaucoup de personnes changent leur manière de consommer, cela peut influencer la société et encourager des décisions plus écologiques."
          }
        ]
      },
      {
        category: "Vie quotidienne",
        title: "Mon quartier",
        prompt: "Décrivez votre quartier. Dites ce que vous aimez et ce que vous voudriez améliorer.",
        format: "Description · 120-160 mots",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Un quartier calme",
            body: "J'habite dans un quartier calme. Il y a un parc, une boulangerie, une pharmacie et quelques cafés. J'aime ce quartier parce qu'il est pratique.\n\nLe matin, je peux acheter du pain frais. Le soir, je me promène dans le parc. Je voudrais seulement avoir plus de bus, parce que le centre-ville est un peu loin."
          },
          {
            level: "B1",
            title: "Un endroit pratique",
            body: "Mon quartier est assez agréable à vivre. Il n'est pas très célèbre, mais il offre beaucoup de services utiles: des magasins, une bibliothèque, des écoles et plusieurs espaces verts.\n\nCe que j'aime le plus, c'est l'ambiance tranquille. Les voisins se saluent et les rues sont sûres. En revanche, il manque des transports le soir. Si la ville améliorait ce point, le quartier serait presque idéal."
          }
        ]
      },
      {
        category: "Travail",
        title: "Le travail idéal",
        prompt: "Écrivez sur votre travail idéal. Expliquez les horaires, les tâches et l'ambiance.",
        format: "Texte personnel · 120-170 mots",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Un travail intéressant",
            body: "Mon travail idéal serait intéressant et pas trop stressant. Je voudrais travailler avec des personnes gentilles et apprendre de nouvelles choses.\n\nJ'aimerais avoir des horaires réguliers, mais aussi un peu de flexibilité. Pour moi, l'ambiance est très importante. Un bon salaire est utile, mais ce n'est pas la seule chose."
          },
          {
            level: "B1",
            title: "Équilibre et motivation",
            body: "Le travail idéal, pour moi, doit offrir un bon équilibre entre motivation et qualité de vie. J'aimerais avoir des tâches variées, des collègues respectueux et un responsable qui fait confiance à son équipe.\n\nJe ne cherche pas seulement un salaire élevé. Je voudrais surtout sentir que mon travail a du sens et qu'il me permet de progresser. La flexibilité serait aussi importante, par exemple avec quelques jours de télétravail."
          }
        ]
      }
    ]
  },
  {
    language: "de",
    skill: "speaking",
    start: 1,
    topics: [
      {
        category: "Alltag",
        title: "Mein Tagesablauf",
        prompt: "Sprechen Sie über einen normalen Tag. Beschreiben Sie Ihre Routine und was Sie gern ändern möchten.",
        format: "Mündliche Antwort · 2 Minuten",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Ein normaler Tag",
            body: "Mein Tag beginnt meistens um sieben Uhr. Ich stehe auf, dusche und frühstücke zu Hause. Dann fahre ich zur Arbeit oder lerne am Computer.\n\nAm Abend koche ich etwas Einfaches und lese ein bisschen. Ich möchte früher ins Bett gehen, weil ich morgens oft müde bin."
          },
          {
            level: "B1",
            title: "Routine mit kleinen Pausen",
            body: "An einem normalen Tag versuche ich, eine klare Struktur zu haben. Morgens erledige ich die wichtigsten Aufgaben, weil ich dann am meisten Energie habe.\n\nNachmittags mache ich gern eine kurze Pause und gehe spazieren. Das hilft mir, den Kopf frei zu bekommen. Was ich ändern möchte, ist mein Umgang mit dem Handy. Manchmal verliere ich dadurch zu viel Zeit."
          }
        ]
      },
      {
        category: "Reisen",
        title: "Eine Reise, die Sie mögen",
        prompt: "Erzählen Sie von einer Reise. Wohin sind Sie gefahren, was haben Sie gemacht und warum war sie besonders?",
        format: "Erzählung · 2-3 Minuten",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Ein Wochenende in Berlin",
            body: "Letztes Jahr war ich ein Wochenende in Berlin. Ich bin mit dem Zug gefahren und habe bei einem Freund geschlafen.\n\nWir haben Museen besucht, viel gegessen und sind durch die Stadt gelaufen. Die Reise war kurz, aber sehr schön, weil ich viel gesehen habe."
          },
          {
            level: "B1",
            title: "Mehr als ein kurzer Ausflug",
            body: "Eine Reise, die ich besonders mochte, war ein Wochenende in Berlin. Ich kannte die Stadt vorher nur aus Bildern, deshalb war ich sehr neugierig.\n\nWir haben nicht nur bekannte Sehenswürdigkeiten besucht, sondern auch kleine Cafés und ruhige Straßen entdeckt. Besonders schön fand ich die Mischung aus Geschichte, Kreativität und Alltag. Nach der Reise hatte ich das Gefühl, bald wiederkommen zu wollen."
          }
        ]
      },
      {
        category: "Gesundheit",
        title: "Gesund leben",
        prompt: "Sprechen Sie darüber, was für ein gesundes Leben wichtig ist. Nennen Sie Beispiele.",
        format: "Meinung · 2 Minuten",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Essen, Bewegung, Schlaf",
            body: "Für ein gesundes Leben sind drei Dinge wichtig: gutes Essen, Bewegung und Schlaf. Man sollte Obst und Gemüse essen und genug Wasser trinken.\n\nBewegung muss nicht kompliziert sein. Man kann spazieren gehen oder Fahrrad fahren. Außerdem sollte man nicht zu spät schlafen gehen."
          },
          {
            level: "B1",
            title: "Gesundheit im Alltag",
            body: "Gesund zu leben bedeutet für mich nicht, perfekt zu sein. Wichtig ist, im Alltag gute Entscheidungen zu treffen: regelmäßige Bewegung, ausgewogenes Essen und genug Schlaf.\n\nAuch die mentale Gesundheit spielt eine große Rolle. Wer ständig gestresst ist, fühlt sich auf Dauer nicht gesund. Deshalb versuche ich, Pausen zu machen, soziale Kontakte zu pflegen und nicht jeden Abend am Bildschirm zu verbringen."
          }
        ]
      }
    ]
  },
  {
    language: "de",
    skill: "writing",
    start: 1,
    topics: [
      {
        category: "Verkehr",
        title: "Öffentliche Verkehrsmittel",
        prompt: "Schreiben Sie über öffentliche Verkehrsmittel in der Stadt. Nennen Sie Vorteile und Probleme.",
        format: "Meinungstext · 120-170 Wörter",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Bus und Bahn",
            body: "Öffentliche Verkehrsmittel sind sehr praktisch. Viele Menschen fahren mit dem Bus oder mit der Bahn zur Arbeit, zur Schule oder in die Stadt.\n\nEin Vorteil ist, dass man kein Auto braucht. Das ist billiger und besser für die Umwelt. Ein Problem ist aber, dass Busse manchmal zu spät kommen. Ich finde, Städte sollten mehr in gute Verbindungen investieren."
          },
          {
            level: "B1",
            title: "Wichtig für die Stadt",
            body: "Öffentliche Verkehrsmittel sind für eine moderne Stadt sehr wichtig. Wenn Busse und Bahnen zuverlässig, sauber und sicher sind, benutzen mehr Menschen sie im Alltag.\n\nDas hat viele Vorteile: weniger Autos, weniger Stau und weniger Luftverschmutzung. Gleichzeitig gibt es oft Probleme mit Verspätungen oder hohen Preisen. Meiner Meinung nach sollte die Stadt den öffentlichen Verkehr verbessern, damit er für alle eine echte Alternative zum Auto wird."
          }
        ]
      },
      {
        category: "Lernen",
        title: "Sprachen lernen",
        prompt: "Schreiben Sie darüber, warum Menschen Sprachen lernen und welche Methoden helfen.",
        format: "Persönlicher Text · 120-170 Wörter",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Jeden Tag ein bisschen",
            body: "Viele Menschen lernen Sprachen für Reisen, Arbeit oder Freunde. Eine neue Sprache ist interessant, aber manchmal auch schwer.\n\nMir helfen kurze Übungen. Ich höre Dialoge, schreibe neue Wörter auf und wiederhole Sätze. Ich glaube, man muss nicht jeden Tag lange lernen. Wichtig ist, regelmäßig zu üben."
          },
          {
            level: "B1",
            title: "Motivation und Praxis",
            body: "Menschen lernen Sprachen aus vielen Gründen: Sie möchten reisen, im Beruf bessere Chancen haben oder andere Kulturen verstehen. Für mich ist eine Sprache auch eine neue Art zu denken.\n\nBeim Lernen helfen vor allem regelmäßige Praxis und echte Situationen. Grammatik ist wichtig, aber man sollte auch sprechen, hören und schreiben. Fehler gehören dazu. Wer geduldig bleibt und die Sprache oft benutzt, macht mit der Zeit sichtbare Fortschritte."
          }
        ]
      },
      {
        category: "Medien",
        title: "Soziale Medien",
        prompt: "Schreiben Sie über soziale Medien. Sind sie eher positiv oder negativ?",
        format: "Argumentativer Text · 130-180 Wörter",
        levelRange: "A2 - B1",
        examples: [
          {
            level: "A2",
            title: "Kontakt mit Freunden",
            body: "Soziale Medien haben gute und schlechte Seiten. Man kann mit Freunden schreiben, Fotos teilen und Informationen finden.\n\nAber viele Menschen verbringen zu viel Zeit am Handy. Manchmal vergleicht man sich auch mit anderen und fühlt sich schlecht. Ich denke, soziale Medien sind nützlich, wenn man sie nicht zu viel benutzt."
          },
          {
            level: "B1",
            title: "Nützlich, aber nicht harmlos",
            body: "Soziale Medien sind aus dem Alltag kaum noch wegzudenken. Sie helfen uns, mit Freunden in Kontakt zu bleiben, Nachrichten zu lesen und neue Ideen zu entdecken.\n\nTrotzdem sehe ich auch Nachteile. Viele Nutzer verbringen sehr viel Zeit mit kurzen Videos oder vergleichen ihr Leben mit perfekten Bildern. Das kann Stress verursachen. Meiner Meinung nach sind soziale Medien weder nur gut noch nur schlecht. Entscheidend ist, wie bewusst man sie nutzt."
          }
        ]
      }
    ]
  }
];

for (const module of modules) {
  const dir = path.join(BASE, module.language, module.skill);
  fs.mkdirSync(dir, { recursive: true });
  module.topics.forEach((topic, index) => {
    const payload = {
      id: slugify(topic.title),
      language: module.language,
      skill: module.skill,
      order: module.start + index,
      category: topic.category,
      title: topic.title,
      prompt: topic.prompt,
      format: topic.format,
      levelRange: topic.levelRange,
      levels: topic.examples.map((example) => example.level),
      examples: topic.examples,
      tags: [],
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(dir, `${payload.id}.json`), JSON.stringify(payload, null, 2) + "\n", "utf8");
  });
}

console.log(`Seeded ${modules.reduce((sum, module) => sum + module.topics.length, 0)} topics.`);
