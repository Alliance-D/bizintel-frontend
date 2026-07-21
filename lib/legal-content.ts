// Bilingual content for the /legal page (Privacy Policy + End User Licence Agreement).
// Rendered by components/pages/LegalPage.tsx based on the active locale.
// The English text is the governing version; the Kinyarwanda is a full translation
// provided for accessibility (a native-speaker legal review is still advisable).

export const LEGAL_EFFECTIVE_DATE_EN = "20 July 2026";
export const LEGAL_EFFECTIVE_DATE_RW = "20 Nyakanga 2026";
export const LEGAL_CONTACT_EMAIL = "dushimealliance1@gmail.com";

export type LegalSection = { h: string; p?: string[]; ul?: string[] };

export type LegalDoc = {
  kicker: string;
  title: string;
  effective: string;
  intro: string;
  toc: { privacy: string; eula: string; summary: string };
  summary: { h: string; ul: string[]; note: string };
  privacyH: string;
  privacy: LegalSection[];
  eulaH: string;
  eulaIntro: string;
  eula: LegalSection[];
  note?: string;
  footer: string;
};

const en: LegalDoc = {
  kicker: "BizIntel",
  title: "Privacy Policy and Terms of Use",
  effective: `Effective ${LEGAL_EFFECTIVE_DATE_EN}. This page covers two things: how BizIntel handles data (Privacy Policy) and the terms under which you may use the assessment (End User Licence Agreement).`,
  intro: "",
  toc: { privacy: "Privacy Policy", eula: "Terms of Use (EULA)", summary: "The short version" },
  summary: {
    h: "The short version",
    ul: [
      "BizIntel shows you where demand for a type of business outruns the shops already open across Kigali, giving you a data-backed shortlist of the areas worth a closer look.",
      "Use it to compare candidate locations and find room to grow, then confirm the strongest areas on the ground (rent, foot traffic, informal shops) before you commit.",
      "An optional AI summary explains each result in plain language; the numbers it is based on are the authoritative part.",
      "It is free and needs no account: we never ask for your name, phone number, email, or location, and we keep only brief technical records to keep the service running.",
      "Our map data can under-count informal shops, so treat a very empty-looking area as a reason to look closer, not a dead end.",
    ],
    note: "The full text below is what legally applies; this summary is just here to make it easier to follow.",
  },
  privacyH: "Privacy Policy",
  privacy: [
    {
      h: "1. Who is responsible",
      p: [
        "BizIntel is an academic research and decision-support system built as a Bachelor of Software Engineering Mission Capstone project at African Leadership University, Kigali, Rwanda. For the purposes of Law No. 058/2021 of 13/10/2021 relating to the protection of personal data and privacy, the data controller is the project author, Dushime Zirimwabagabo Alliance, reachable at " + LEGAL_CONTACT_EMAIL + ".",
      ],
    },
    {
      h: "2. Using BizIntel without an account",
      p: [
        "The assessment is open to guests. There is no registration, no login, and no user profile. We do not collect your name, national identification number, telephone number, email address, payment details, or precise device location. Accounts exist only for the system administrator (the researcher), who signs in separately.",
      ],
    },
    {
      h: "3. What we collect",
      p: [
        "Assessment inputs. The business category and the area you select (district, sector, and cell, or a point you drop on the map). These describe a place in Kigali, not a person, and are not linked to any identifier that would let us recognise you again.",
        "Technical records. Our servers log the internet protocol (IP) address of incoming requests, the time, the endpoint requested, and basic browser information. We use these only to keep the service running, to apply rate limits that prevent automated abuse, and to diagnose faults. They are kept for no longer than 30 days and are not used to build a profile of you.",
        "Language preference. Your choice of English or Kinyarwanda is stored in your own browser so the interface stays in the language you picked. It is not sent to us as a user record.",
        "Research feedback, where you give it. If you take part in a usability study and complete a feedback survey, those responses are collected separately, on the basis of your consent, under the conditions explained to you at the time. You may withdraw that consent by contacting us.",
      ],
    },
    {
      h: "4. Where your request goes",
      p: [
        "The application and its database are hosted on Render, whose infrastructure is located outside Rwanda. If you request the optional written interpretation of your result, the area-level numeric findings are sent to Google's Gemini API to be turned into prose; no personal data is included, and if the service is unavailable BizIntel still returns the underlying figures.",
        "Because these providers operate outside Rwanda, this involves a cross-border transfer within the meaning of Law No. 058/2021. The transfer is limited to non-personal, area-level data and to the technical records described above.",
      ],
    },
    {
      h: "5. What we never do",
      p: [
        "We do not sell data. We do not run advertising or third-party tracking. We do not share technical records with anyone except where a court or a competent Rwandan authority lawfully requires it.",
      ],
    },
    {
      h: "6. The underlying data, and business names shown",
      p: [
        "BizIntel is built on openly published data: OpenStreetMap, available under the Open Database Licence; WorldPop gridded population estimates; and aggregated statistics published by the National Institute of Statistics of Rwanda. None of these sources identifies private individuals.",
        "Where OpenStreetMap records a business, BizIntel may show its name and location as a nearby competitor or point of interest. That information is already public in OpenStreetMap; BizIntel neither adds private detail to it nor creates a profile of any business owner. Counts are reported by area, not as a register of individual traders.",
      ],
    },
    {
      h: "7. Your rights",
      p: [
        "Under Law No. 058/2021 you have the right to be informed about processing, to access personal data held about you, to have it corrected or erased, to object to processing, and to lodge a complaint with the National Cyber Security Authority as the supervisory body. Because the guest assessment holds no personal data about you, there is normally nothing to retrieve; requests relating to research feedback or technical records can be sent to " + LEGAL_CONTACT_EMAIL + " and will be answered within 30 days.",
      ],
    },
    {
      h: "8. Children",
      p: [
        "BizIntel is intended for adults considering starting a business and is not directed at children. We do not knowingly collect data from children.",
      ],
    },
    {
      h: "9. Changes",
      p: [
        `If this policy changes materially, the effective date at the top of this page will be updated and the change noted here. The current version applies from ${LEGAL_EFFECTIVE_DATE_EN}.`,
      ],
    },
  ],
  eulaH: "End User Licence Agreement (Terms of Use)",
  eulaIntro: "By using BizIntel you accept these terms. If you do not accept them, do not use the service.",
  eula: [
    {
      h: "1. What you may do",
      p: [
        "You are granted a free, non-exclusive, non-transferable, revocable licence to use BizIntel to inform your own business planning, and to use the reports it generates for that purpose, including sharing them with advisers, lenders, or cooperatives. You are not granted ownership of the software, the models, or the underlying datasets.",
      ],
    },
    {
      h: "2. What BizIntel tells you, stated precisely",
      p: [
        "BizIntel estimates how many businesses of a chosen category an area's population, amenities, and accessibility would ordinarily support, and compares that estimate with how many are recorded there now. The difference is reported as a band: under-served, balanced, or saturated.",
        "It does not predict whether a business will succeed, survive, or be profitable. Those outcomes depend on capital, pricing, management, supply, staffing, rent, and competition at the level of the individual premises, none of which BizIntel observes. Results are reported as bands rather than exact rankings because the precise ordering of areas is not stable enough to rely on.",
      ],
    },
    {
      h: "3. Known limits of the data",
      p: ["Read every result with these limitations in mind:"],
      ul: [
        "The map data underlying BizIntel systematically under-records informal businesses, which make up the large majority of commercial activity in Kigali. An area shown as under-served may instead be under-mapped.",
        "Demand is inferred from residential population and nearby amenities. It is not measured foot traffic.",
        "Results describe an area of roughly 500 metres across. They do not describe a specific plot, street, or building.",
        "Two of the five categories, salon and cafe, rest on a small number of recorded observations and are offered as illustrative only.",
        "The data reflects a point in time and is not updated continuously.",
      ],
    },
    {
      h: "4. AI-generated interpretation",
      p: [
        "The optional written commentary shown beneath your results is produced by a third-party AI model working from the figures BizIntel has calculated. It is constrained to those figures, but AI systems can still state things inaccurately or with unwarranted confidence. The numeric findings above it are the authoritative output. Do not treat the commentary as professional, financial, legal, or investment advice.",
      ],
    },
    {
      h: "5. How you may not use BizIntel",
      ul: [
        "Do not present its output as a guarantee of commercial success to anyone, including investors, lenders, or prospective partners.",
        "Do not scrape, bulk-query, or otherwise extract the dataset in a way that circumvents rate limits, and do not resell access to it.",
        "Do not attempt to reverse engineer the models, interfere with the service, or reach the administrative interface.",
        "Do not use BizIntel to target, harass, or undermine identified existing traders.",
      ],
    },
    {
      h: "6. Ownership and attribution",
      p: [
        "The BizIntel software, trained models, and interface remain the property of the author. Map data is (c) OpenStreetMap contributors and is used under the Open Database Licence; population estimates are used under the terms published by WorldPop; official statistics are used under the terms published by the National Institute of Statistics of Rwanda. Any redistribution of derived data must preserve these attributions.",
      ],
    },
    {
      h: "7. No warranty and limitation of liability",
      p: [
        "BizIntel is provided as it is, without warranty of accuracy, completeness, availability, or fitness for a particular purpose. It is an academic project and is not a licensed financial, investment, or professional advisory service. To the fullest extent permitted by Rwandan law, the author accepts no liability for loss arising from decisions taken in reliance on its output. You remain responsible for your own commercial decisions.",
      ],
    },
    {
      h: "8. Availability and changes",
      p: [
        "As a research deployment, the service may be modified, interrupted, or withdrawn without notice. These terms may be updated; the effective date at the top of the page shows the current version.",
      ],
    },
    {
      h: "9. Governing law",
      p: [
        "These terms are governed by the laws of the Republic of Rwanda, and the courts of Rwanda have jurisdiction over any dispute arising from them.",
      ],
    },
    {
      h: "10. Contact",
      p: ["Questions, corrections, and data requests: " + LEGAL_CONTACT_EMAIL + "."],
    },
  ],
  footer: "BizIntel, Mission Capstone, African Leadership University, 2026.",
};

const rw: LegalDoc = {
  kicker: "BizIntel",
  title: "Politiki y'Ibanga n'Amabwiriza yo Gukoresha",
  effective: `Bitangira gukurikizwa ${LEGAL_EFFECTIVE_DATE_RW}. Iyi paji ikubiyemo ibintu bibiri: uko BizIntel ikoresha amakuru (Politiki y'Ibanga) n'amabwiriza akugenga mu gukoresha isesengura (Amasezerano yo Gukoresha).`,
  intro: "",
  toc: { privacy: "Politiki y'Ibanga", eula: "Amabwiriza yo Gukoresha", summary: "Muri make" },
  summary: {
    h: "Muri make",
    ul: [
      "BizIntel ikwereka aho, mu Kigali, ikenerwa ry'ubwoko bw'ubucuruzi rirenze ubucuruzi busanzwe bukoraho, ikaguha urutonde rushingiye ku makuru rw'uturere dukwiye kurebwa hafi.",
      "Ikoreshe mu kugereranya ahantu washaka gutangiriramo no kubona aho hakiri umwanya wo kwaguka, hanyuma wemeze ahantu heza kurusha ku butaka (ubukode, uko abantu banyura, n'ubucuruzi butanditse) mbere yo gufata icyemezo.",
      "Hari incamake ya AI y'ubushake isobanura buri gisubizo mu magambo yoroshye; imibare ishingiyeho ni yo ifite ijambo rya nyuma.",
      "Ni ubuntu kandi ntikeneye konti: ntitugusaba amazina, nimero ya telefone, imeyili, cyangwa aho uherereye, kandi tubika gusa amakuru make ya tekiniki kugira ngo serivisi ikomeze gukora.",
      "Amakuru y'ikarita dukoresha ashobora kuba adafite ubucuruzi butanditse bwose, bityo ahantu hasa nk'aho hadafite ubucuruzi hafate nk'impamvu yo kureba hafi, atari nk'aho nta cyo hamaze.",
    ],
    note: "Inyandiko yuzuye iri hepfo ni yo ikurikizwa mu mategeko; iyi ncamake iri hano kugira ngo byorohe kumva gusa.",
  },
  privacyH: "Politiki y'Ibanga",
  privacy: [
    {
      h: "1. Uwo bireba",
      p: [
        "BizIntel ni sisitemu y'ubushakashatsi bwa kaminuza kandi ifasha gufata ibyemezo, yakozwe nk'umushinga wa Capstone wo mu cyiciro cya Bachelor of Software Engineering muri African Leadership University, i Kigali, mu Rwanda. Ku byerekeye Itegeko No. 058/2021 ryo ku wa 13/10/2021 rirengera amakuru bwite n'ibanga, ushinzwe amakuru ni uwakoze umushinga, Dushime Zirimwabagabo Alliance, ushobora kugerwaho kuri " + LEGAL_CONTACT_EMAIL + ".",
      ],
    },
    {
      h: "2. Gukoresha BizIntel utagize konti",
      p: [
        "Isesengura rifungurira abashyitsi bose. Nta kwiyandikisha, nta kwinjira, kandi nta mwirondoro w'ukoresha. Ntitwegeranya amazina yawe, nimero y'indangamuntu, nimero ya telefone, imeyili, amakuru yo kwishyura, cyangwa aho igikoresho cyawe kiherereye neza. Konti zibaho gusa ku muyobozi wa sisitemu (umushakashatsi), winjira ukwe.",
      ],
    },
    {
      h: "3. Amakuru twegeranya",
      p: [
        "Ibyo winjiza mu isesengura. Ubwoko bw'ubucuruzi n'ahantu wahisemo (akarere, umurenge, n'akagari, cyangwa akadomo ushyize ku ikarita). Ibi bisobanura ahantu i Kigali, atari umuntu, kandi ntibihuzwa n'ikimenyetso cyatuma tukongera tukakumenya.",
        "Amakuru ya tekiniki. Serivisi zacu zandika aderesi ya IP y'ibyifuzo bihageze, igihe, aho byasabiwe, n'amakuru make y'imbuga (browser). Tubikoresha gusa kugira ngo serivisi ikomeze gukora, dushyireho imbibi zibuza gukoreshwa nabi n'imashini, kandi dukemure ibibazo bya tekiniki. Bibikwa mu gihe kitarenze iminsi 30 kandi ntibikoreshwa mu gukora umwirondoro wawe.",
        "Ururimi wahisemo. Guhitamo Icyongereza cyangwa Ikinyarwanda bibikwa muri browser yawe kugira ngo imbuga igume mu rurimi wahisemo. Ntibitwoherezwa nk'inyandiko y'ukoresha.",
        "Ibitekerezo by'ubushakashatsi, aho ubitanze. Niba witabiriye ubushakashatsi ku mikoreshereze ukuzuza ifishi y'ibitekerezo, izo nyandiko zegeranywa ukwazo, hashingiwe ku bwumvikane bwawe, mu buryo wasobanuriwe icyo gihe. Ushobora kwikura kuri ubwo bwumvikane utumenyesheje.",
      ],
    },
    {
      h: "4. Aho icyifuzo cyawe kigana",
      p: [
        "Porogaramu n'ububiko bwayo bw'amakuru bibitswe kuri Render, ibikorwaremezo byayo biherereye hanze y'u Rwanda. Nusaba ubusobanuro bwanditse bw'ibisubizo byawe (ntabwo ari itegeko), imibare y'urwego rw'ahantu yoherezwa kuri Google's Gemini API kugira ngo ihindurwe inyandiko; nta makuru bwite ashyirwamo, kandi igihe serivisi itabonetse BizIntel iracyagaragaza imibare shingiro.",
        "Kubera ko izi serivisi zikorera hanze y'u Rwanda, ibi bikubiyemo koherezwa hakurya y'imbibi mu buryo buteganywa n'Itegeko No. 058/2021. Koherezwa kugarukira ku makuru atari bwite, ay'urwego rw'ahantu, no ku makuru ya tekiniki avuzwe haruguru.",
      ],
    },
    {
      h: "5. Ibyo tutigera dukora",
      p: [
        "Ntitugurisha amakuru. Ntidukora kwamamaza cyangwa gukurikirana kw'abandi. Ntitugabana amakuru ya tekiniki n'undi muntu uretse gusa aho urukiko cyangwa urwego rubifitiye ububasha mu Rwanda rubisaba mu buryo bwemewe n'amategeko.",
      ],
    },
    {
      h: "6. Amakuru shingiro, n'amazina y'ubucuruzi agaragazwa",
      p: [
        "BizIntel yubakiye ku makuru asohowe ku mugaragaro: OpenStreetMap, aboneka ku bw'Uruhushya rwa Open Database; imibare y'abaturage ya WorldPop; n'imibare rusange yasohowe n'Ikigo cy'Igihugu cy'Ibarurishamibare mu Rwanda. Nta n'imwe muri izi nkomoko iranga abantu ku giti cyabo.",
        "Aho OpenStreetMap yanditse ubucuruzi, BizIntel ishobora kwerekana izina ryabwo n'aho buherereye nk'uwo muhatana wegereye cyangwa ahantu h'ingenzi. Ayo makuru asanzwe ari ku mugaragaro muri OpenStreetMap; BizIntel ntiyongeraho amakuru bwite cyangwa ngo ikore umwirondoro w'uwo ari we wese utunze ubucuruzi. Imibare itangwa ku rwego rw'ahantu, atari nk'urutonde rw'abacuruzi ku giti cyabo.",
      ],
    },
    {
      h: "7. Uburenganzira bwawe",
      p: [
        "Ku bw'Itegeko No. 058/2021 ufite uburenganzira bwo kumenyeshwa ibijyanye n'itunganya ry'amakuru, kugera ku makuru bwite afitwe kuri wowe, gusaba ko akosorwa cyangwa asibwa, guhakana itunganywa, no gutanga ikirego ku Rwego rw'Igihugu rushinzwe Umutekano wa Interineti nk'urwego rugenzura. Kubera ko isesengura ry'abashyitsi ridafite amakuru bwite yawe, ubusanzwe nta kintu cyakuwaho; ibyifuzo bijyanye n'ibitekerezo by'ubushakashatsi cyangwa amakuru ya tekiniki bishobora koherezwa kuri " + LEGAL_CONTACT_EMAIL + " kandi bizasubizwa mu minsi 30.",
      ],
    },
    {
      h: "8. Abana",
      p: [
        "BizIntel igenewe abantu bakuru batekereza gutangira ubucuruzi kandi ntigenewe abana. Ntitwegeranya amakuru y'abana ku bushake.",
      ],
    },
    {
      h: "9. Impinduka",
      p: [
        `Iyo iyi politiki ihindutse mu buryo bugaragara, itariki yo gutangira gukurikizwa iri hejuru y'iyi paji izahindurwa kandi impinduka ivugwe hano. Verisiyo iriho ikurikizwa guhera ${LEGAL_EFFECTIVE_DATE_RW}.`,
      ],
    },
  ],
  eulaH: "Amasezerano yo Gukoresha (Amabwiriza)",
  eulaIntro: "Mu gukoresha BizIntel wemera aya mabwiriza. Niba utayemera, ntugakoreshe serivisi.",
  eula: [
    {
      h: "1. Ibyo wemerewe gukora",
      p: [
        "Uhawe uruhushya rw'ubuntu, rutari urwihariye, rudashobora kwegurirwa undi, kandi rushobora kwamburwa, rwo gukoresha BizIntel mu gutegura ubucuruzi bwawe, no gukoresha raporo zibyara kuri iyo ntego, harimo kuzisangiza abajyanama, ababguriza, cyangwa amakoperative. Ntuhabwa ubwite bw'iyi porogaramu, imodoka z'imibare, cyangwa amakuru shingiro.",
      ],
    },
    {
      h: "2. Icyo BizIntel ikubwira, mu buryo busobanutse",
      p: [
        "BizIntel igereranya umubare w'ubucuruzi bw'ubwoko wahisemo ahantu, ishingiye ku baturage, ibikorwa remezo, no kugerwaho, hanyuma ikagereranya n'umubare w'ubwanditswe aho ubu. Itandukaniro ritangwa nk'urwego: hakennye, hangana, cyangwa haruzuye.",
        "Ntabwo iteganya niba ubucuruzi buzatera imbere, buzarama, cyangwa buzabyara inyungu. Ibyo biterwa n'imari, ibiciro, imicungire, ibicuruzwa, abakozi, ubukode, n'ipiganwa ku rwego rw'inzu ubwayo, nta na kimwe muri ibyo BizIntel ireba. Ibisubizo bitangwa nk'inzego aho kuba urutonde rwuzuye kubera ko itondekanya nyaryo ry'ahantu ridahamye ngo ryizerwe.",
      ],
    },
    {
      h: "3. Aho amakuru agarukira",
      p: ["Soma buri gisubizo wibuka izi mbogamizi:"],
      ul: [
        "Amakuru y'ikarita ashingirwaho na BizIntel asiga inyuma ubucuruzi butanditse, bwo bugize igice kinini cy'ibikorwa by'ubucuruzi i Kigali. Ahantu herekanwa nk'aho hakennye hashobora kuba hatarandikwe gusa.",
        "Ubukene bw'isoko bushingirwa ku baturage batuye n'ibikorwa remezo byegereye. Ntabwo ari uko abantu banyura koko babaruwe.",
        "Ibisubizo bisobanura ahantu hangana na metero 500 z'ubugari. Ntibisobanura umwanya, umuhanda, cyangwa inyubako runaka.",
        "Ibyiciro bibiri muri bitanu, salo na kafe, bishingiye ku mubare muto w'ibyanditswe kandi bitangwa nk'ingero gusa.",
        "Amakuru agaragaza igihe runaka kandi ntahora avugururwa.",
      ],
    },
    {
      h: "4. Ubusobanuro bukozwe na AI",
      p: [
        "Ubusobanuro bwanditse bw'ubushake buboneka munsi y'ibisubizo byawe bukorwa n'ubwenge bw'ubukorano (AI) bw'undi muntu, bushingiye ku mibare BizIntel yabaze. Bugarukira kuri iyo mibare, ariko sisitemu za AI zishobora kuvuga ibintu mu buryo butari ukuri cyangwa hamwe n'icyizere kitari cyo. Imibare iri hejuru yabwo ni yo isubizo nyakuri. Ntugafate ubwo busobanuro nk'inama y'umwuga, iy'imari, iy'amategeko, cyangwa iyo gushora imari.",
      ],
    },
    {
      h: "5. Uko utagomba gukoresha BizIntel",
      ul: [
        "Ntugaragaze ibisubizo byayo nk'icyemezo cy'uko ubucuruzi buzagenda neza ku muntu uwo ari we wese, harimo abashoramari, ababguriza, cyangwa abafatanyabikorwa.",
        "Ntukurure, ntusabe amakuru menshi ku buryo bwikubye, cyangwa ngo ukuremo amakuru unyuranyije n'imbibi zashyizweho, kandi ntugurishe uburyo bwo kuyageraho.",
        "Ntugerageze gusesengura uko imodoka z'imibare zubatse, guhungabanya serivisi, cyangwa kugera ku rubuga rw'ubuyobozi.",
        "Ntukoreshe BizIntel mu kwibasira, guhoza ku nkeke, cyangwa kwangiza abacuruzi bazwi basanzwe bahari.",
      ],
    },
    {
      h: "6. Ubwite n'ishimwe ry'inkomoko",
      p: [
        "Porogaramu ya BizIntel, imodoka z'imibare zatojwe, n'imbuga bikomeza kuba iby'uwabikoze. Amakuru y'ikarita ni (c) abatanze OpenStreetMap kandi akoreshwa ku bw'Uruhushya rwa Open Database; imibare y'abaturage ikoreshwa hakurikijwe amabwiriza yatanzwe na WorldPop; imibare ya Leta ikoreshwa hakurikijwe amabwiriza yatanzwe n'Ikigo cy'Igihugu cy'Ibarurishamibare mu Rwanda. Gusubiza mu bandi amakuru akomoka kuri aya bigomba kubungabunga aya mashimwe.",
      ],
    },
    {
      h: "7. Nta garanti n'aho ubwishingizi bugarukira",
      p: [
        "BizIntel itangwa uko iri, nta garanti y'ukuri, y'uzuzanya, y'ukuboneka, cyangwa y'uko ikwiye intego runaka. Ni umushinga wa kaminuza kandi si serivisi yemewe y'imari, iyo gushora imari, cyangwa iy'ubujyanama bw'umwuga. Mu rwego rwose rwemewe n'amategeko y'u Rwanda, uwabikoze ntiyishingira igihombo giturutse ku byemezo byafashwe hashingiwe ku bisubizo byayo. Uguma ari wowe ushinzwe ibyemezo byawe by'ubucuruzi.",
      ],
    },
    {
      h: "8. Ukuboneka n'impinduka",
      p: [
        "Kubera ko ari iyashyizweho ku bushakashatsi, serivisi ishobora guhindurwa, guhagarikwa, cyangwa gukurwaho nta menyekanisha. Aya mabwiriza ashobora kuvugururwa; itariki yo gutangira gukurikizwa iri hejuru y'iyi paji igaragaza verisiyo iriho.",
      ],
    },
    {
      h: "9. Itegeko rigenga",
      p: [
        "Aya mabwiriza agengwa n'amategeko ya Repubulika y'u Rwanda, kandi inkiko z'u Rwanda zifite ububasha ku mpaka zose zaturuka kuri yo.",
      ],
    },
    {
      h: "10. Kutugeraho",
      p: ["Ibibazo, ibikosorwa, n'ibyifuzo by'amakuru: " + LEGAL_CONTACT_EMAIL + "."],
    },
  ],
  note: "Iyi verisiyo y'Ikinyarwanda ni ubusemuzi bwatanzwe kugira ngo byorohe kugerwaho. Mu gihe habaye ukutumvikana, verisiyo y'Icyongereza ni yo igira agaciro mu by'amategeko.",
  footer: "BizIntel, Mission Capstone, African Leadership University, 2026.",
};

export const legalContent: Record<"en" | "rw", LegalDoc> = { en, rw };
