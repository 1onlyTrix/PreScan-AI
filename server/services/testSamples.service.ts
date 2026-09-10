export interface TestSampleData {
  id: string;
  name: string;
  category: string;
  language: string;
  durationSeconds: number;
  title: string;
  description: string;
  tags: string[];
  madeForKids: boolean;
  transcript: {
    segments: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    fullText: string;
  };
}

export const TEST_SAMPLES: Record<string, TestSampleData> = {
  clean_tutorial: {
    id: 'clean_tutorial',
    name: 'Clean Educational Tutorial (Test A)',
    category: 'Education',
    language: 'en',
    durationSeconds: 145,
    title: 'Beginner Web Development: Introduction to CSS Flexbox',
    description: 'Learn the fundamentals of CSS Flexbox layout system with step by step examples. Links to documentation in the description.',
    tags: ['coding', 'webdev', 'css', 'programming', 'tutorial'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 15, text: "Welcome back to the channel. Today we're diving into CSS Flexbox, one of the most powerful layout tools in modern web development." },
        { startSeconds: 15, endSeconds: 38, text: "Flexbox allows you to align items along a primary axis and a cross axis seamlessly without using floats or positioning hacks." },
        { startSeconds: 38, endSeconds: 65, text: "First, let's declare display flex on our parent container. Notice how all the child elements immediately line up in a horizontal row." },
        { startSeconds: 65, endSeconds: 98, text: "To center items horizontally, we use justify-content: center. To center them vertically, we apply align-items: center." },
        { startSeconds: 98, endSeconds: 125, text: "You can also use flex-wrap: wrap if you want items to wrap onto multiple lines on smaller mobile viewports." },
        { startSeconds: 125, endSeconds: 145, text: "That wraps up our quick intro to Flexbox. Check the resources linked below, and subscribe for the next video on CSS Grid." },
      ],
      fullText: "Welcome back to the channel. Today we're diving into CSS Flexbox, one of the most powerful layout tools in modern web development. Flexbox allows you to align items along a primary axis and a cross axis seamlessly without using floats or positioning hacks. First, let's declare display flex on our parent container. Notice how all the child elements immediately line up in a horizontal row. To center items horizontally, we use justify-content: center. To center them vertically, we apply align-items: center. You can also use flex-wrap: wrap if you want items to wrap onto multiple lines on smaller mobile viewports. That wraps up our quick intro to Flexbox. Check the resources linked below, and subscribe for the next video on CSS Grid.",
    },
  },

  profanity_heavy: {
    id: 'profanity_heavy',
    name: 'Profanity & Ad Suitability (Test B)',
    category: 'Entertainment',
    language: 'en',
    durationSeconds: 110,
    title: 'Unfiltered Rant About My Morning Commute',
    description: 'A completely unhinged recap of the crazy traffic and bad drivers this morning.',
    tags: ['rant', 'traffic', 'storytime', 'vlog'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 18, text: "What the fuck is wrong with drivers today? Literally within five seconds of pulling out, some asshole cuts me off." },
        { startSeconds: 18, endSeconds: 42, text: "I'm sitting at the red light, and this shithead in a pickup starts laying on his horn like a total dumbass." },
        { startSeconds: 42, endSeconds: 70, text: "I lost my damn mind. I rolled down my window and yelled, 'Learn how to drive you fucking idiot!' It was complete bullshit." },
        { startSeconds: 70, endSeconds: 95, text: "Every single day it's the same crap on the highway. People don't know what a turn signal is." },
        { startSeconds: 95, endSeconds: 110, text: "Anyway, that's my rant for today. Let me know if your morning commute was just as much of a shitshow." },
      ],
      fullText: "What the fuck is wrong with drivers today? Literally within five seconds of pulling out, some asshole cuts me off. I'm sitting at the red light, and this shithead in a pickup starts laying on his horn like a total dumbass. I lost my damn mind. I rolled down my window and yelled, 'Learn how to drive you fucking idiot!' It was complete bullshit. Every single day it's the same crap on the highway. People don't know what a turn signal is. Anyway, that's my rant for today. Let me know if your morning commute was just as much of a shitshow.",
    },
  },

  comedy_roast: {
    id: 'comedy_roast',
    name: 'Comedy Roast with Context (Test C)',
    category: 'Comedy',
    language: 'en',
    durationSeconds: 120,
    title: 'Standup Comedy: Roasting My Best Friends',
    description: 'Highlights from my stand-up comedy set at the Laugh Factory roasting my buddies in good fun.',
    tags: ['comedy', 'standup', 'roast', 'jokes', 'humor'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 20, text: "Alright, so my buddy Dave is in the front row tonight. Look at him. Dave looks like he was drawn from memory by someone who hates people." },
        { startSeconds: 20, endSeconds: 50, text: "No, I love Dave, he's like a brother to me, but man, he dresses like he lost a fight with a clearance rack at a 1998 thrift store." },
        { startSeconds: 50, endSeconds: 85, text: "He told me yesterday he started a diet. His diet is eating whatever he wants and crying about it in the mirror. You're a savage Dave, keep it up man." },
        { startSeconds: 85, endSeconds: 120, text: "Give it up for Dave, everyone! He takes the jokes like a champ. Thanks for laughing with us tonight!" },
      ],
      fullText: "Alright, so my buddy Dave is in the front row tonight. Look at him. Dave looks like he was drawn from memory by someone who hates people. No, I love Dave, he's like a brother to me, but man, he dresses like he lost a fight with a clearance rack at a 1998 thrift store. He told me yesterday he started a diet. His diet is eating whatever he wants and crying about it in the mirror. You're a savage Dave, keep it up man. Give it up for Dave, everyone! He takes the jokes like a champ. Thanks for laughing with us tonight!",
    },
  },

  gaming_stream: {
    id: 'gaming_stream',
    name: 'Gaming Commentary (Test D)',
    category: 'Gaming',
    language: 'en',
    durationSeconds: 130,
    title: 'Clutch 1v4 Victory in Ranked Finals',
    description: 'High intensity match in ranked arena clutch gameplay with team voice chat commentary.',
    tags: ['gaming', 'ranked', 'clutch', 'gameplay', 'fps'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 25, text: "Alright we are down 3 to 4, last round, my teammates just got eliminated. I have to clutch this 1v4 right now." },
        { startSeconds: 25, endSeconds: 55, text: "There's one on the catwalk... got him! Oh shit, flanking left! Get down, damn it that was close!" },
        { startSeconds: 55, endSeconds: 88, text: "Two players left on B site. Planting the spike... headshot! Let's freaking go! One more, he's behind the crate..." },
        { startSeconds: 88, endSeconds: 110, text: "Boom! Acieved! We won the match! Oh my god, that was insane! What a clutch!" },
        { startSeconds: 110, endSeconds: 130, text: "Drop a like if you enjoyed that play, and don't forget to hit follow for tomorrow's tournament stream." },
      ],
      fullText: "Alright we are down 3 to 4, last round, my teammates just got eliminated. I have to clutch this 1v4 right now. There's one on the catwalk... got him! Oh shit, flanking left! Get down, damn it that was close! Two players left on B site. Planting the spike... headshot! Let's freaking go! One more, he's behind the crate... Boom! Acieved! We won the match! Oh my god, that was insane! What a clutch! Drop a like if you enjoyed that play, and don't forget to hit follow for tomorrow's tournament stream.",
    },
  },

  sensitive_history: {
    id: 'sensitive_history',
    name: 'Sensitive Educational Topic (Test E)',
    category: 'Education',
    language: 'en',
    durationSeconds: 160,
    title: 'Historical Analysis: The Siege of Leningrad (1941-1944)',
    description: 'An educational overview of the military strategy, civilian hardships, and historical impact of the 872-day siege during World War II.',
    tags: ['history', 'ww2', 'education', 'documentary', 'military'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 25, text: "In this documentary lecture, we examine the historical records of the Siege of Leningrad, which lasted from September 1941 to January 1944." },
        { startSeconds: 25, endSeconds: 65, text: "Historians document that over 600,000 civilians perished from severe famine, extreme sub-zero temperatures, and continuous artillery bombardment." },
        { startSeconds: 65, endSeconds: 105, text: "Archival diaries from residents describe the rationing system where daily bread rations were reduced to 125 grams per person of sawdust-mixed flour." },
        { startSeconds: 105, endSeconds: 140, text: "The Road of Life across frozen Lake Ladoga served as the only evacuation corridor for children and supply route for medical aid during the winter months." },
        { startSeconds: 140, endSeconds: 160, text: "Understanding these events provides vital historical context on 20th century warfare and civilian resilience under siege." },
      ],
      fullText: "In this documentary lecture, we examine the historical records of the Siege of Leningrad, which lasted from September 1941 to January 1944. Historians document that over 600,000 civilians perished from severe famine, extreme sub-zero temperatures, and continuous artillery bombardment. Archival diaries from residents describe the rationing system where daily bread rations were reduced to 125 grams per person of sawdust-mixed flour. The Road of Life across frozen Lake Ladoga served as the only evacuation corridor for children and supply route for medical aid during the winter months. Understanding these events provides vital historical context on 20th century warfare and civilian resilience under siege.",
    },
  },

  copyright_reference: {
    id: 'copyright_reference',
    name: 'Copyright Verbal Reference (Test F)',
    category: 'Music',
    language: 'en',
    durationSeconds: 135,
    title: 'Top 10 Pop Songs of the 2010s Breakdown',
    description: 'Reviewing and breaking down the greatest pop hits of the past decade.',
    tags: ['music', 'pop', 'review', 'analysis', 'charts'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 25, text: "Hey everyone, today we are counting down the top pop anthems of the 2010s." },
        { startSeconds: 25, endSeconds: 65, text: "Coming in at number 3, we have 'Shape of You' by Ed Sheeran. I'm going to play the studio master recording clip right here in full stereo sound." },
        { startSeconds: 65, endSeconds: 95, text: "Notice that distinctive marimba groove and acoustic percussion line in the verse that drove the entire track to number one on Billboard." },
        { startSeconds: 95, endSeconds: 135, text: "Let's also listen to Taylor Swift's 'Shake It Off' master track intro for comparison of 2014 production trends." },
      ],
      fullText: "Hey everyone, today we are counting down the top pop anthems of the 2010s. Coming in at number 3, we have 'Shape of You' by Ed Sheeran. I'm going to play the studio master recording clip right here in full stereo sound. Notice that distinctive marimba groove and acoustic percussion line in the verse that drove the entire track to number one on Billboard. Let's also listen to Taylor Swift's 'Shake It Off' master track intro for comparison of 2014 production trends.",
    },
  },

  metadata_mismatch: {
    id: 'metadata_mismatch',
    name: 'Metadata Inconsistency (Test G)',
    category: 'Film & Animation',
    language: 'en',
    durationSeconds: 120,
    title: 'Fun ABC Learning Cartoon For Toddlers & Preschoolers! 👶 Alphabet Song',
    description: 'Educational nursery rhyme and ABC sing-along for babies, toddlers, and kindergarten kids! Learn the alphabet today!',
    tags: ['kids', 'nurseryrhymes', 'abc', 'toddlers', 'education'],
    madeForKids: true,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 25, text: "Welcome back to Crypto Investing Weekly. Today we are analyzing high risk leveraged Bitcoin futures trading strategies." },
        { startSeconds: 25, endSeconds: 65, text: "If you are trading with 50x leverage on margin, you need to set your liquidation stop loss immediately or you will lose your entire portfolio." },
        { startSeconds: 65, endSeconds: 95, text: "We are also reviewing altcoin derivative contracts and liquidity yield farming pools on decentralized exchanges." },
        { startSeconds: 95, endSeconds: 120, text: "Remember, cryptocurrency investments involve extreme risk of financial loss. Don't invest money you can't afford to lose." },
      ],
      fullText: "Welcome back to Crypto Investing Weekly. Today we are analyzing high risk leveraged Bitcoin futures trading strategies. If you are trading with 50x leverage on margin, you need to set your liquidation stop loss immediately or you will lose your entire portfolio. We are also reviewing altcoin derivative contracts and liquidity yield farming pools on decentralized exchanges. Remember, cryptocurrency investments involve extreme risk of financial loss. Don't invest money you can't afford to lose.",
    },
  },

  non_english_hindi: {
    id: 'non_english_hindi',
    name: 'Non-English Content - Hindi (Test H)',
    category: 'Science & Technology',
    language: 'hi',
    durationSeconds: 140,
    title: 'Python Programming Tutorial in Hindi | Beginners Guide',
    description: 'Python programming sikhne ke liye beginner friendly tutorial. Data types aur variables ki puri jankari.',
    tags: ['python', 'coding', 'hindi', 'programming', 'tutorial'],
    madeForKids: false,
    transcript: {
      segments: [
        { startSeconds: 0, endSeconds: 25, text: "Namaste dosto! Aaj ke is video mein hum Python programming language ke basics seekhenge." },
        { startSeconds: 25, endSeconds: 65, text: "Python ek bohot hi aasan aur powerful programming language hai jo web development aur data science mein use hoti hai." },
        { startSeconds: 65, endSeconds: 105, text: "Sabse pehle hum variables aur data types jaise integers, strings aur lists ke baare mein baat karenge." },
        { startSeconds: 105, endSeconds: 140, text: "Agar aapko yeh video pasand aaya toh channel ko subscribe karein aur bell icon dabayein. Dhanyawad!" },
      ],
      fullText: "Namaste dosto! Aaj ke is video mein hum Python programming language ke basics seekhenge. Python ek bohot hi aasan aur powerful programming language hai jo web development aur data science mein use hoti hai. Sabse pehle hum variables aur data types jaise integers, strings aur lists ke baare mein baat karenge. Agar aapko yeh video pasand aaya toh channel ko subscribe karein aur bell icon dabayein. Dhanyawad!",
    },
  },
};
