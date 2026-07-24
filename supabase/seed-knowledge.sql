-- FarmNexus Knowledge Base Vector Seed Data

-- Generated automatically by backend/src/scripts/ingestKnowledge.js

-- Dimensions: 768 (text-embedding-004)


TRUNCATE TABLE public.knowledge_chunks;


INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-001',
  'Crop Cultivation',
  'Rice Paddy — Kharif Season Planting Guide',
  'Rice (Oryza sativa) is India''s most important Kharif crop, planted during June-July with the onset of monsoon and harvested in October-November. Key varieties include Basmati (aromatic, long-grain, primarily grown in Punjab, Haryana, and UP), Sona Masuri (medium grain, popular in AP and Telangana), and IR-64 (high-yield, grown in eastern India). Nursery preparation begins 30 days before transplanting. Seedlings are raised in well-puddled nursery beds with 40-50 kg seeds/hectare. Transplanting is done when seedlings are 20-25 days old with 2-3 seedlings per hill at 20x15 cm spacing. Ideal soil pH is 5.5-6.5 with adequate standing water of 2-5 cm during vegetative stage. Recommended NPK fertilizer dose is 120:60:60 kg/hectare for irrigated rice.',
  'ICAR — Rice Production Technology Handbook',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-002',
  'Crop Cultivation',
  'Wheat — Rabi Season Cultivation',
  'Wheat is India''s primary Rabi (winter) crop, sown from October to December and harvested in March-April. Major wheat-growing states include Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, and Rajasthan. Popular varieties are HD-2967, HD-3086 (timely sown), PBW-343, and Sharbati (MP). Optimal sowing temperature is 20-25°C. Seed rate is 100 kg/ha for timely sowing and 125 kg/ha for late sowing. Row spacing should be 20-22.5 cm. Wheat requires 4-6 irrigations: Crown Root Initiation (CRI at 21 days, most critical), tillering, jointing, flowering, milk, and dough stages. Recommended fertilizer dose is 150:60:40 kg NPK/ha with half N as basal and rest in two splits. Average yield potential is 45-55 quintals/hectare under good management.',
  'ICAR-IIWBR — Wheat Cultivation Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-003',
  'Crop Cultivation',
  'Tomato Cultivation in India',
  'Tomato (Solanum lycopersicum) is one of India''s most important vegetable crops, cultivated across all states. Major production states are Andhra Pradesh, Madhya Pradesh, Karnataka, Gujarat, and Odisha. Varieties include Pusa Ruby, Arka Vikas, Arka Rakshak (bacterial wilt resistant), and various F1 hybrids. Tomatoes are a warm-season crop requiring 21-24°C for optimal growth. Seeds are sown in nursery beds and transplanted after 25-30 days at 60x45 cm spacing. Staking is recommended for indeterminate varieties. NPK recommendation is 120:80:80 kg/ha. Major diseases include early blight, late blight, bacterial wilt, and tomato leaf curl virus (transmitted by whiteflies). Drip irrigation with mulching increases yield by 25-30%. Average yield is 25-40 tonnes/hectare. Harvest begins 60-80 days after transplanting.',
  'ICAR-IIVR — Vegetable Crop Production Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-004',
  'Crop Cultivation',
  'Mango Production and Orchard Management',
  'India is the world''s largest mango producer, contributing ~45% of global production (~20 million tonnes annually). Key varieties include Alphonso (Ratnagiri, Maharashtra), Dasheri (Lucknow, UP), Langra (Varanasi), Banganapalli (AP), Kesar (Gujarat), and Totapuri (Karnataka). Mango trees are planted at 10x10m spacing (100 trees/ha) or 5x5m for high-density plantations (400 trees/ha). Trees begin bearing fruit from 5th year. Flowering occurs from December to February, with fruit maturity from April to July. Key practices include annual pruning after harvest, regular manuring (50-100 kg FYM + NPK per tree), and pest/disease management for mango hopper, fruit fly, powdery mildew, and anthracnose. Post-harvest hot water treatment at 52°C for 5 minutes extends shelf life.',
  'National Horticulture Board — Mango Production Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-005',
  'Crop Cultivation',
  'Sugarcane Cultivation Practices',
  'India is the world''s second-largest sugarcane producer after Brazil, with UP, Maharashtra, Karnataka, Tamil Nadu, and Gujarat being major producing states. Common varieties are Co-0238, Co-86032, CoC-671, and CoJ-64. Planting seasons are: Adsali (July-August), Pre-seasonal (October-November), and Suru (January-February). Seed rate is 30,000-40,000 three-budded setts/ha. Row spacing is 90-120 cm. Sugarcane is a heavy feeder requiring 250:100:120 kg NPK/ha. Earthing up is done at 90 and 120 days. Major pests include early shoot borer, internode borer, and top borer. Key diseases are red rot, smut, and grassy shoot. Average yield is 70-100 tonnes/ha with 10-12% sugar recovery.',
  'ICAR-SBI — Sugarcane Production Technology',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-006',
  'Crop Cultivation',
  'Cotton Cultivation in India',
  'India has the largest area under cotton cultivation globally, with Gujarat, Maharashtra, Telangana, Andhra Pradesh, and Rajasthan as major states. Varieties include Bt cotton hybrids (most popular), Suraj, and MCU-5. Sowing is done from May to July with monsoon onset. Seed rate is 2.5-3 kg/ha for hybrid varieties. Spacing is 90-120 cm between rows and 45-60 cm between plants. NPK recommendation is 80:40:40 kg/ha for rainfed and 120:60:60 for irrigated. Bollworm, whitefly, and pink bollworm are major pests. Diseases include bacterial blight, Alternaria leaf spot, and root rot. Cotton picking begins 150-180 days after sowing. Average yield is 500 kg lint/ha for irrigated and 300 kg/ha for rainfed conditions.',
  'ICAR-CICR — Cotton Production Technology',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-007',
  'Crop Cultivation',
  'Banana Cultivation and Tissue Culture',
  'India is the largest producer of bananas globally, with Tamil Nadu, Maharashtra, Gujarat, AP, and Karnataka as top states. Major commercial varieties: Grand Naine (Cavendish group, most popular for export), Robusta, Dwarf Cavendish, Rasthali (Silk), and Red Banana. Tissue culture plants are preferred for disease-free uniform plantations. Planting density is 1,800-2,500 plants/ha at 1.8x1.8m spacing. Bananas require heavy irrigation: 10-12 mm/week. Fertilizer dose: 200:100:300 g NPK/plant/year applied in 6-8 splits. Desuckering, propping, and bunch covering with perforated polyethylene bags are critical practices. Panama wilt (Fusarium) and Sigatoka leaf spot are major diseases. Bunch harvest at 75% maturity (110-130 days after flowering). Yield: 50-70 tonnes/ha.',
  'NHB — Banana Production Technology Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'crop-008',
  'Crop Cultivation',
  'Pulses — Increasing Protein Production',
  'India is the largest producer, consumer, and importer of pulses globally. Major pulse crops: Chickpea (Gram/Chana, Rabi), Pigeonpea (Tur/Arhar, Kharif), Mung bean (Moong, Kharif/Summer), Black gram (Urad, Kharif), and Lentil (Masur, Rabi). Pulses fix atmospheric nitrogen through Rhizobium symbiosis, enriching soil by 40-50 kg N/ha. Key states: MP, Maharashtra, Rajasthan, UP, and Karnataka. Seed treatment with Rhizobium and Trichoderma is essential. Pulses are generally rainfed crops with low water requirement. NPK: 20:40:20 kg/ha (starter dose). Major issues: pod borer in chickpea, wilt in pigeonpea. NFSM (National Food Security Mission) promotes pulse cultivation with subsidies on seeds, micronutrients, and IPM kits.',
  'ICAR-IIPR — Pulse Production Technologies',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'pest-001',
  'Pest & Disease Management',
  'Integrated Pest Management (IPM) in Indian Agriculture',
  'Integrated Pest Management (IPM) is a holistic approach combining biological, cultural, physical, and chemical methods to manage pests economically while minimizing environmental risks. Key IPM principles for Indian farming: (1) Cultural control — crop rotation, resistant varieties, proper spacing, and timely sowing. (2) Biological control — using Trichogramma parasitoids for bollworms, Trichoderma for soil-borne diseases, Beauveria bassiana for white grub. (3) Mechanical control — pheromone traps (5 traps/ha), yellow sticky traps for whitefly, light traps for moths. (4) Chemical control as last resort — use Economic Threshold Level (ETL) before spraying. Government promotes IPM through Central IPM Centers across India. Neem-based pesticides (Azadirachtin) are effective against 200+ pest species.',
  'Directorate of Plant Protection — IPM Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'pest-002',
  'Pest & Disease Management',
  'Major Rice Diseases and Management',
  'Key rice diseases in India: (1) Blast (Pyricularia oryzae) — Diamond-shaped lesions on leaves; manage with Tricyclazole 75WP @ 0.6g/L or resistant varieties like Samba Mahsuri. (2) Bacterial Leaf Blight (Xanthomonas oryzae) — Yellowish-white lesions from leaf tips; no effective chemical; use resistant varieties. (3) Sheath Blight (Rhizoctonia solani) — Oval greenish-grey lesions on sheath; spray Hexaconazole 5EC @ 2ml/L. (4) Brown Spot (Helminthosporium oryzae) — Oval brown spots; apply Mancozeb 75WP @ 2.5g/L. (5) False Smut — Greenish-yellow balls on panicle; spray Propiconazole 25EC @ 1ml/L at booting stage. Prevention: Use disease-free certified seeds, maintain proper spacing, avoid excess nitrogen, and treat seeds with Carbendazim 50WP @ 2g/kg.',
  'ICAR-IIRR — Rice Disease Management Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'pest-003',
  'Pest & Disease Management',
  'Common Vegetable Pests and Organic Solutions',
  'Major vegetable pests in India and organic management: (1) Fruit borer in tomato/brinjal — Use Neem oil 5ml/L + Bt (Bacillus thuringiensis) 1g/L spray at 10-day intervals; install pheromone traps 5/ha. (2) Aphids in cruciferous vegetables — Spray neem seed kernel extract (NSKE) 5% or release Chrysoperla carnea @ 50,000/ha. (3) Diamondback Moth (DBM) in cabbage — Bt spray, Trichogramma release, intercropping with coriander/mustard as trap crop. (4) Whitefly in tomato/chilli — Yellow sticky traps, neem oil, reflective silver mulch. (5) Red spider mite in brinjal — Spray sulfur 80WP 3g/L or release predatory mite Amblyseius. Organic farmers should follow a 10-day spray schedule alternating neem oil, Bt, and Pseudomonas fluorescens.',
  'ICAR-IIVR — Organic Pest Management in Vegetables',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'pest-004',
  'Pest & Disease Management',
  'Fall Armyworm Management in Maize',
  'Fall Armyworm (Spodoptera frugiperda), first reported in India in 2018, is now a major threat to maize across southern and central India. Identification: Larvae have an inverted Y-shaped marking on the head. Damage: Feeds on whorl leaves creating characteristic windowpane patterns and destroying growing points. Management: (1) Early detection through pheromone traps (5/ha). (2) Application of sand + lime (9:1) or dry ash into the whorl to kill early instar larvae. (3) Spray 5% NSKE or Bt (Bacillus thuringiensis var. kurstaki). (4) Release of Trichogramma pretiosum egg parasitoid @ 50,000/ha at 3 releases. (5) Chemical: Spinetoram 11.7SC @ 0.5ml/L or Chlorantraniliprole 18.5SC @ 0.4ml/L (last resort). (6) Intercrop maize with pulses or cowpea to encourage natural enemies.',
  'ICAR-IIMR — Fall Armyworm Advisory',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'pest-005',
  'Pest & Disease Management',
  'Locust Attack Prevention and Management',
  'Desert locust (Schistocerca gregaria) invasions periodically threaten crops in Rajasthan, Gujarat, and parts of Punjab and Haryana. A single locust swarm can contain 40-80 million locusts per sq km and consume food equivalent to 35,000 people per day. Prevention and management: (1) Monitor through FAO Desert Locust Watch and LO (Locust Warning Organization) based in Jodhpur, Rajasthan. (2) Aerial spraying of Malathion 96% ULV using Micronair AU-7000 at 1-1.25 L/ha by Locust Circle Offices. (3) For small hoppers on farms: spray Chlorpyriphos 20EC @ 2ml/L or Lambda-cyhalothrin 5EC. (4) Farmers should report swarm sightings to the nearest Locust Circle Office or call the toll-free number 1800-180-1551. (5) Crop insurance under PMFBY covers locust damage if reported within 72 hours.',
  'Locust Warning Organization — Jodhpur, India',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'soil-001',
  'Soil Health',
  'Soil Health Card Scheme and Testing',
  'The Soil Health Card (SHC) Scheme, launched in February 2015 by the Government of India, provides soil health cards to all farmers every 2 years. The card contains crop-wise recommendations for 12 nutrients: primary (N, P, K), secondary (S, Ca, Mg), and micro (Zn, Fe, Mn, Cu, B, Mo). Soil samples are collected in a grid of 2.5 ha in irrigated areas and 10 ha in rainfed areas. Testing is done at government labs and Krishi Vigyan Kendras (KVKs). Key soil parameters tested: pH, EC (electrical conductivity), organic carbon, available N/P/K, and micronutrients. Over 23 crore soil health cards have been distributed. Farmers can check their soil health card status online at soilhealth.dac.gov.in. The scheme has led to a 10-15% reduction in fertilizer use and 5-8% increase in crop yields on adopted farms.',
  'Ministry of Agriculture — Soil Health Card Scheme Portal',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'soil-002',
  'Soil Health',
  'Composting and Organic Carbon Management',
  'Indian agricultural soils are critically low in organic carbon — 60% of soils have less than 0.5% organic carbon (ideal is 1.5-2%). Methods to improve soil organic carbon: (1) Vermicomposting — Eisenia fetida (red worms) convert farm waste into nutrient-rich compost in 45-60 days. 1 tonne FYM produces 500-600 kg vermicompost. Apply 5 tonnes/ha. (2) NADEP composting — Brick tank method (12x5x3 ft) layering farm waste, cattle dung, and soil. Produces 3-4 tonnes in 90-120 days. (3) Green manuring — Grow Dhaincha (Sesbania), Sunhemp (Crotalaria juncea), or cowpea and incorporate at 45-60 days; adds 60-80 kg N/ha. (4) Crop residue retention — Retain 30% crop residue instead of burning; use Happy Seeder for wheat sowing in paddy residue. (5) Biochar application — Rice husk biochar at 2-5 tonnes/ha improves water holding capacity and carbon sequestration.',
  'ICAR — Soil Health and Organic Farming Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'soil-003',
  'Soil Health',
  'Soil pH Management and Reclamation',
  'Soil pH affects nutrient availability and crop growth. Optimal pH range for most crops: 6.0-7.5. (1) Acidic soils (pH < 5.5) — Found in NE India, Kerala, and high-rainfall areas. Apply agricultural lime (CaCO3) at 2-5 tonnes/ha based on lime requirement test. Dolomite provides both Ca and Mg. (2) Alkaline/Sodic soils (pH > 8.5) — Common in UP, Haryana, Punjab, and Rajasthan. Apply gypsum (CaSO4) at 50% Gypsum Requirement (GR) — typically 5-10 tonnes/ha. CSSRI (Central Soil Salinity Research Institute) recommends sub-surface drainage combined with gypsum application. (3) Saline soils (EC > 4 dS/m) — Managed through improved drainage, leaching with good quality water, and growing salt-tolerant crops like barley, mustard, and berseem. CSR-30 and CSR-36 are salt-tolerant rice varieties developed by CSSRI.',
  'CSSRI Karnal — Soil Reclamation Technology',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'soil-004',
  'Soil Health',
  'NPK Fertilizer Management and Nutrient Balance',
  'India is the second largest consumer of fertilizers globally. Current average NPK use ratio is 6.7:2.4:1 against the ideal 4:2:1. This imbalanced fertilization degrades soil health. Key guidelines: (1) Apply fertilizers based on Soil Health Card recommendations, not arbitrary amounts. (2) Use neem-coated urea (mandatory in India since 2015) which has 10-15% higher nitrogen use efficiency. (3) Split nitrogen application: 50% basal + 25% at tillering + 25% at panicle initiation for rice. (4) DAP (18-46-0) is India''s most popular P fertilizer; apply in root zone for better uptake. (5) MOP (Muriate of Potash, 60% K2O) is essential for fruit quality and disease resistance. (6) Micronutrient deficiency is widespread: Zinc (49% soils deficient), Boron (33%), Iron (12%). Apply ZnSO4 @ 25 kg/ha for zinc-deficient soils. (7) Nano fertilizers (Nano Urea, Nano DAP) by IFFCO offer 50% reduction in conventional fertilizer use.',
  'Fertilizer Association of India — Nutrient Management Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'water-001',
  'Water Management',
  'Drip Irrigation Systems for Indian Farms',
  'Drip irrigation delivers water directly to plant roots through a network of pipes, valves, and emitters, achieving 90-95% water use efficiency compared to 40-50% for flood irrigation. Benefits include 30-50% water savings, 20-30% yield increase, reduced weed growth, and ability to apply fertilizers through fertigation. Key crops suitable for drip: sugarcane, cotton, vegetables, fruits, and plantation crops. System components: Head unit (filter + fertilizer tank), main line (PVC), sub-main, laterals (LLDPE, 12-16mm), and drippers (2-8 LPH). Cost: ₹50,000-1,00,000 per hectare depending on crop and spacing. Government subsidies: PMKSY (Per Drop More Crop) provides 55% subsidy for small/marginal farmers and 45% for others. Apply through State Micro Irrigation Department. Maintenance: flush laterals monthly, clean filters weekly, check emitters for clogging.',
  'Ministry of Agriculture — PMKSY Micro Irrigation Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'water-002',
  'Water Management',
  'Rainwater Harvesting for Agriculture',
  'India receives 1,170 mm average annual rainfall but 80% occurs during 4 monsoon months (June-September). Rainwater harvesting structures for farms: (1) Farm ponds — Excavated ponds of 10x10x3m to 30x30x3m to store runoff water. MGNREGA scheme supports farm pond construction up to ₹1.5 lakh. (2) Check dams — Low walls across streams to recharge groundwater. (3) Percolation tanks — Earthen embankments in permeable soils. (4) Rooftop harvesting — 1 mm rainfall on 100 sq.m roof = 100 litres water. (5) Contour bunding — Earthen bunds along contours reduce runoff by 40-50% in rainfed areas. Water budgeting: A 1-hectare farm needs ~6,000-8,000 cubic meters of water per year for 2 irrigated crops. A 20x20x3m farm pond stores 1,200 cubic meters = enough for supplemental irrigation of 1 ha during dry spells.',
  'ICAR-CRIDA — Rainfed Agriculture Water Management',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'water-003',
  'Water Management',
  'Alternate Wetting and Drying (AWD) in Rice',
  'Alternate Wetting and Drying (AWD) is a water-saving irrigation technique for rice that reduces water use by 15-30% without yield loss. Instead of continuous flooding, fields are alternately flooded and drained. Protocol: (1) Install a perforated PVC pipe (15 cm diameter, 25 cm long) in the field as a water tube. (2) After transplanting, maintain 3-5 cm standing water for 2 weeks. (3) Then allow water to recede until the water level in the tube is 15 cm below soil surface. (4) Re-irrigate to 3-5 cm depth. (5) Repeat cycles except during flowering (maintain 3 cm water). AWD also reduces methane emissions by 30-50%, making it a climate-smart practice. Safe AWD threshold: water level should not drop below 15 cm below soil surface. IRRI recommends this for all irrigated rice systems. Additional benefits: better root development, reduced lodging, and lower incidence of diseases.',
  'IRRI — AWD Water-Saving Technology for Rice',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'water-004',
  'Water Management',
  'Groundwater Management and Recharge',
  'India uses 89% of extracted groundwater for irrigation, making it the world''s largest groundwater user. Over 1,186 blocks (17%) are over-exploited. Key facts: (1) Groundwater depletion rate: 1-3 meters/year in Punjab, Haryana, and Rajasthan. (2) Recharge structures: Recharge wells (abandoned borewells with filter), percolation tanks, and trench-cum-bund along contours increase recharge by 20-40%. (3) Atal Bhujal Yojana (ABY) — ₹6,000 crore World Bank-assisted scheme for groundwater management in 7 states. Includes participatory groundwater monitoring by farmers. (4) Micro-irrigation (drip/sprinkler) reduces groundwater extraction by 30-50%. (5) CGWB monitors groundwater through 23,000+ observation wells. Water level data available at indiawris.gov.in. (6) Rooftop rainwater harvesting in farm buildings: 1 mm rain on 100 sqm = 100 L water.',
  'Central Ground Water Board — Groundwater Management',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'postharvest-001',
  'Post-Harvest Management',
  'Grain Storage and Loss Prevention',
  'India loses approximately 7-10% of its total food grain production during storage, valued at ₹50,000 crore annually. Major causes: insect pests (Khapra beetle, rice weevil, pulse beetle), rodents, and fungi. Best storage practices: (1) Dry grain to safe moisture content — paddy 14%, wheat 12%, pulses 10%. (2) Use metal bins (CAP storage — Cover and Plinth) or Pusa grain storage bins developed by IARI for small farmers (holds 1.5-3 tonnes). (3) Hermetic storage bags (GrainPro, PICS bags) create airtight conditions that kill insects without chemicals — 99% pest mortality after 3 weeks. Cost: ₹150-250 per 50 kg bag. (4) For large-scale: fumigate with Aluminium Phosphide tablets @ 3 tablets per tonne (government-regulated). (5) Traditional methods: mix dried neem leaves at 1-2% by weight, turmeric powder for pulses. (6) FCI and CWC provide scientific storage at government warehouses for registered farmers.',
  'ICAR-CIPHET — Post-Harvest Technology Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'postharvest-002',
  'Post-Harvest Management',
  'Cold Chain Infrastructure for Perishables',
  'India loses 25-30% of fruits and vegetables post-harvest due to inadequate cold chain infrastructure — worth ~₹92,000 crore annually. Cold chain components: (1) Pre-cooling units — hydro-cooling or forced air cooling at farm gate within 4-6 hours of harvest reduces field heat and extends shelf life by 2-4x. (2) Cold storage — maintained at crop-specific temperatures (potato: 2-4°C, apple: 0-1°C, mango: 12-13°C, tomato: 10-12°C). India has ~8,000 cold storages with ~40 million MT capacity, but 75% is for potatoes alone. (3) Refrigerated transport — reefer trucks/vans maintain temperature during transit. (4) Ripening chambers — ethylene-based controlled ripening for banana and mango. Government support: MIDH provides 35-50% subsidy for cold storage construction up to ₹8 crore. NHB provides back-ended credit-linked subsidy for cold chain projects.',
  'National Horticulture Board — Cold Chain Development Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'postharvest-003',
  'Post-Harvest Management',
  'Value Addition and Food Processing',
  'Value addition in agriculture can increase farmer income by 2-5x. Key value-addition activities: (1) Cleaning, grading, and sorting — Sorting tomatoes by size and color can increase price by 15-20%. (2) Primary processing — Flour milling (wheat to atta), dal processing (pulse splitting), rice milling (paddy to rice). (3) Secondary processing — Pickle making (mango, chilli), sauce/ketchup (tomato), chips (banana, potato), dried fruits/spices. (4) Tertiary processing — Ready-to-eat meals, frozen foods. Government initiatives: PM-FME (Formalization of Micro Food Processing Enterprises) provides ₹10 lakh subsidy per unit. PMKSY (One District One Product) focuses on district-specific value-added products. FSSAI licensing is mandatory for any commercial food product — apply at foscos.fssai.gov.in. Farmer Producer Organizations (FPOs) can collectively set up processing units with credit from NABARD.',
  'Ministry of Food Processing Industries — PMFME Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'market-001',
  'Market & Pricing',
  'Minimum Support Price (MSP) System in India',
  'The Government of India announces Minimum Support Prices (MSPs) for 22 mandated crops (14 Kharif, 6 Rabi, 2 commercial) each season based on CACP (Commission for Agricultural Costs and Prices) recommendations. MSPs for 2024-25 Kharif: Paddy ₹2,300/quintal, Jowar ₹3,371, Bajra ₹2,625, Maize ₹2,225, Tur (Arhar) ₹7,550, Moong ₹8,682, Cotton (medium staple) ₹7,121, Soybean ₹4,892. MSP is set at minimum 50% margin over the comprehensive cost of production (A2+FL cost). Procurement is done through FCI (for rice and wheat) and NAFED/NCCF (for pulses and oilseeds). Farmers sell at MSP through government-designated procurement centers. PM-AASHA scheme ensures MSP for pulses, oilseeds, and copra through price support, deficiency payment, or private procurement.',
  'CACP — MSP Reports and Recommendations',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'market-002',
  'Market & Pricing',
  'e-NAM — Electronic National Agriculture Market',
  'e-NAM (Electronic National Agriculture Market) is a pan-India electronic trading portal connecting 1,361 APMC mandis across 23 states into a single unified national market for agricultural commodities. Key features: (1) Online bidding — Farmers and traders participate in transparent auctions. (2) Quality testing — e-NAM mandis have assaying infrastructure for standardized quality parameters. (3) Online payment — Direct bank transfer to farmer''s account within 24 hours. (4) Real-time price discovery — Compare prices across mandis nationwide. Registration: Free for farmers with Aadhaar, bank account, and mobile number. Register at enam.gov.in or through APMC mandi offices. Benefits: eliminates intermediaries, provides competitive pricing (5-15% higher prices reported), and reduces transaction costs. Over 1.76 crore farmers, 2.3 lakh traders, and 1 lakh commission agents registered. Trading in 203 commodities.',
  'Small Farmers Agribusiness Consortium — e-NAM Portal',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'market-003',
  'Market & Pricing',
  'Direct Marketing and Farmer Markets',
  'Direct marketing eliminates intermediaries and allows farmers to sell directly to consumers, earning 40-60% higher prices. Key channels: (1) Apni Mandi (Punjab), Uzhavar Sandhai (Tamil Nadu), Rythu Bazaar (Telangana/AP), Raita Mandi (Karnataka) — government-organized farmer markets with free stall space. (2) Farmer Producer Organizations (FPOs) — Collectives of 300-1000 farmers that aggregate produce, do grading/packaging, and sell directly to retailers, processors, or exports. SFAC provides ₹18 lakh/FPO over 3 years. Over 10,000 FPOs registered. (3) Contract Farming — Agreements with food companies/exporters for pre-determined prices. Model Contract Farming Act 2018 provides legal framework. (4) Online platforms — Direct farmer-to-consumer platforms including BigBasket, DeHaat, Ninjacart, and FarmNexus for direct digital listing and sales.',
  'SFAC — Direct Marketing and FPO Promotion',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'market-004',
  'Market & Pricing',
  'Agricultural Export Opportunities',
  'India exported $53.15 billion worth of agricultural products in 2023-24. Top exports: Spices ($4.25B), rice ($10.4B), marine products ($7.4B), sugar ($5.7B), and cotton ($2.3B). Key export destinations: USA, China, Bangladesh, UAE, and Vietnam. Organic product exports growing at 40% CAGR. Export registration: (1) Obtain IEC (Import Export Code) from DGFT. (2) Register with APEDA for most food products. (3) Register with MPEDA for marine products, Spices Board for spices, Coffee Board for coffee. Quality requirements: FSSAI compliance, phytosanitary certificates from Plant Quarantine department, and specific importing country standards. APEDA provides financial assistance of ₹5 lakh/farmer group for infrastructure, packaging, and quality improvement for export-oriented production.',
  'APEDA — Agricultural Export Policy and Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'scheme-001',
  'Government Schemes',
  'PM-KISAN — Pradhan Mantri Kisan Samman Nidhi',
  'PM-KISAN is a central government scheme launched on 24 February 2019 providing ₹6,000 per year in 3 equal installments of ₹2,000 to all landholding farmer families across India. Eligibility: All farmer families with cultivable landholding (no income or land ceiling). Exclusions: Institutional landholders, income tax payers, government employees drawing ₹10,000+ monthly pension. Registration: Online at pmkisan.gov.in or through Common Service Centres (CSC) using Aadhaar, bank account, and land records. Payment is transferred directly to registered bank account (DBT). As of 2024, over 11 crore farmers have benefited with ₹2.42 lakh crore total disbursal since inception. e-KYC is mandatory (using Aadhaar OTP or biometric). Beneficiary status can be checked on pmkisan.gov.in using Aadhaar or registered mobile number. State governments can provide top-up amounts — e.g., AP YSR Rythu Bharosa provides additional ₹7,500/year.',
  'PM-KISAN Official Portal — pmkisan.gov.in',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'scheme-002',
  'Government Schemes',
  'PMFBY — Pradhan Mantri Fasal Bima Yojana (Crop Insurance)',
  'PMFBY is India''s flagship crop insurance scheme covering all food, oilseed, horticulture, and commercial crops. Farmer premium rates: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops. Government pays the remaining premium. Coverage includes: pre-sowing losses (prevented sowing due to deficit rainfall), mid-season adversity (flood, drought, hailstorm), post-harvest losses (up to 14 days), and localized calamities (landslide, hailstorm). Claim process: (1) Report crop loss within 72 hours through Crop Insurance App, toll-free 14447, or nearest agriculture office. (2) Insurance company conducts Crop Cutting Experiments (CCEs). (3) Claims settled within 2 months of harvest using satellite and drone-based remote sensing data. Sum insured is based on Scale of Finance set by SLCCCI. Enrollment: through banks (loanee farmers automatic, non-loanee voluntary) or CSCs by cutoff date (31 July for Kharif, 31 December for Rabi).',
  'PMFBY Official Portal — pmfby.gov.in',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'scheme-003',
  'Government Schemes',
  'Kisan Credit Card (KCC) Scheme',
  'Kisan Credit Card provides short-term credit for crop cultivation, post-harvest expenses, and allied agriculture activities at subsidized interest rates. Interest rate: 7% p.a. with 3% interest subvention for timely repayment (effective rate: 4% p.a. for loans up to ₹3 lakh). Credit limit set based on operational landholding, cropping pattern, and scale of finance. Components: (1) Crop production loan — for seeds, fertilizers, pesticides, labor. (2) Post-harvest/marketing expenses. (3) Maintenance of farm assets. (4) Agriculture and allied activities — dairy, fishery, poultry, beekeeping. Eligibility: All farmers — individual, joint, tenant, sharecroppers, oral lessees, and SHG members. Apply at any commercial bank, cooperative bank, or Regional Rural Bank with land records, identity proof, and 2 passport photos. Card valid for 5 years with annual renewal. Crop insurance premium (PMFBY) can be deducted from KCC credit limit. Over 7.5 crore KCCs issued since 1998.',
  'NABARD — Kisan Credit Card Scheme Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'scheme-004',
  'Government Schemes',
  'PM-KUSUM — Solar Pump and Solar Energy Scheme',
  'Pradhan Mantri Kisan Urja Suraksha evam Utthan Mahaabhiyan (PM-KUSUM) promotes solar energy in the farm sector. Three components: (A) 10,000 MW solar plants on barren/fallow agricultural land — farmer earns ₹60,000-1,00,000 per MW per year by selling solar power to DISCOM. (B) Standalone solar water pumps — up to 7.5 HP capacity for individual farmers. Central subsidy: 30%, State subsidy: 30%, Farmer contribution: 40%. (C) Solarization of existing grid-connected pumps — Farmer installs solar panels, uses solar power for pumping, sells surplus to grid. Net metering enables additional income. Pump capacities: 3 HP, 5 HP, 7.5 HP, and 10 HP. A 5 HP solar pump costs ₹4-5 lakh; with 60% subsidy, farmer pays ₹1.6-2 lakh. Can irrigate 2-3 acres with drip irrigation. Apply through State DISCOM or Renewable Energy Agency portal.',
  'MNRE — PM-KUSUM Scheme Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'scheme-005',
  'Government Schemes',
  'MGNREGA for Farm Infrastructure',
  'Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA) provides 100 days of guaranteed wage employment per year to rural households. For agriculture: MGNREGA funds can be used for individual beneficiary works including: (1) Farm ponds and water harvesting structures — Capacity 10x10x3m to 30x30x3m, cost ₹75,000-1.5 lakh. (2) Wells and bore well recharging structures. (3) Land development — leveling, bunding, and terracing of agricultural land. (4) Horticulture plantation on individual farmland. (5) Cattle shed, poultry shelter, and goat shelter construction. (6) Vermicompost pits — 7x3x2 ft concrete pits. Application: Apply through Gram Panchayat or online at nrega.nic.in. Wage rate varies by state — ₹267-333/day (2024-25). Materials component up to 40% of project cost. Convergence with other schemes (PMKSY, SHC) is encouraged.',
  'Ministry of Rural Development — MGNREGA Operational Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'organic-001',
  'Organic Farming',
  'Organic Certification Process in India',
  'India has the largest number of organic farmers globally (4.4 million+) and ranks 5th in total organic farmland (4.7 million hectares). Certification systems: (1) Third-party certification — Through APEDA-accredited agencies (27 agencies) following NPOP (National Programme for Organic Production) standards. Process: Application → Document review → Farm inspection → Conversion period (2-3 years) → Certification. Cost: ₹10,000-50,000 depending on farm size and agency. (2) PGS (Participatory Guarantee System) — Group-based peer review certification for domestic market. Groups of 5+ farmers mutually inspect and certify. Free of cost, managed through PGS-India portal (pgsindia-ncof.gov.in). Certified organic produce gets 20-30% premium over conventional. For export: NPOP certification is mandatory, reciprocally recognized by EU, Switzerland, and USDA NOP. Government support: PKVY provides ₹50,000/ha over 3 years for organic farming clusters of 50+ farmers.',
  'APEDA — National Programme for Organic Production (NPOP)',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'organic-002',
  'Organic Farming',
  'Natural Farming — Zero Budget Natural Farming (ZBNF)',
  'Zero Budget Natural Farming (ZBNF), promoted as Subhash Palekar Natural Farming (SPNF), is a set of farming methods that eliminates external inputs. Four key pillars: (1) Jeevamrutha — Fermented microbial culture made from cow dung (10 kg), cow urine (10 L), jaggery (2 kg), pulse flour (2 kg), and water (200 L). Apply 200 L/acre every 15 days. Acts as soil inoculant boosting beneficial microbes. (2) Beejamrutha — Seed treatment with cow dung, cow urine, lime, and soil. Protects against seed-borne diseases. (3) Acchadana (Mulching) — Soil mulching with crop residue to conserve moisture and prevent weed growth. (4) Whapasa — Maintaining optimal moisture (not flooding). Andhra Pradesh is implementing ZBNF across 6 million farms through APCNF — world''s largest agroecology program. Results show equivalent yields to conventional farming with 70-80% reduction in input costs.',
  'NITI Aayog — Natural Farming Promotion Report',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'organic-003',
  'Organic Farming',
  'Bio-fertilizers and Bio-pesticides',
  'Bio-fertilizers are living microorganisms that enhance nutrient availability. Key types: (1) Rhizobium — Nitrogen fixer for legumes/pulses. Apply as seed treatment @ 200g/10 kg seeds. Fixes 50-100 kg N/ha/year. (2) Azotobacter — Free-living N-fixer for non-legume crops (wheat, rice, vegetables). 20-30 kg N/ha. (3) Azospirillum — Associated N-fixer for cereals and millets. (4) PSB (Phosphorus Solubilizing Bacteria) — Bacillus megaterium, solubilizes unavailable P. Apply @ 200g/10 kg seeds. (5) Mycorrhizal fungi (VAM) — Enhances P and micronutrient uptake, especially in horticultural crops. Bio-pesticides: (1) Trichoderma viride/harzianum — Soil treatment for fusarium wilt, root rot. 2.5 kg/ha mixed with FYM. (2) Pseudomonas fluorescens — Against bacterial wilt and sheath blight. (3) Beauveria bassiana — Against white grub, stem borer. (4) NPV (Nuclear Polyhedrosis Virus) — Against Helicoverpa armigera (bollworm). Available at State Bio-control Labs and KVKs at ₹100-300 per kg.',
  'ICAR-NBAIM — Bio-fertilizer and Bio-pesticide Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'weather-001',
  'Weather & Climate',
  'Monsoon and Crop Planning in India',
  'India''s agriculture is critically dependent on the South-West monsoon (June-September) which contributes 75% of annual rainfall. Key monsoon facts for farmers: (1) Normal onset dates: Kerala — June 1, Mumbai — June 10, Delhi — June 25, NE India — June 5. (2) IMD provides Long Range Forecast (LRF) in April and updated forecast in June. (3) Kharif crop planning based on monsoon: Normal monsoon (96-104% of LPA) — plant as per regular schedule. Excess monsoon — prepare drainage, choose waterlogging-tolerant varieties. Deficient monsoon — choose short-duration drought-tolerant varieties, plan supplemental irrigation. (4) AAS (Agromet Advisory Services) — IMD provides district-level weekly crop advisories through 200 Agromet Field Units. Access at mausam.imd.gov.in or through Meghdoot/Damini apps. (5) Monsoon break periods (dry spells of 5+ days) are critical — have supplemental irrigation ready during reproductive stage.',
  'IMD — Agrometeorological Advisory Services',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'weather-002',
  'Weather & Climate',
  'Climate-Smart Agriculture Practices',
  'Climate-smart agriculture (CSA) aims to sustainably increase productivity, enhance resilience, and reduce GHG emissions. Key CSA practices for Indian farmers: (1) Drought-tolerant varieties — Sahbhagi Dhan (rice), HHB-67 (bajra), CSV-17 (sorghum). (2) System of Rice Intensification (SRI) — Reduces water use by 40%, methane emissions by 50%. Uses younger seedlings (8-12 days), wider spacing (25x25cm), and intermittent irrigation. (3) Conservation agriculture — Zero tillage + residue retention + crop rotation. Happy Seeder enables direct wheat sowing in paddy residue, saving ₹3,000-4,000/ha. (4) Agroforestry — Tree-crop integration (Poplar + wheat in UP, Teak + turmeric in Maharashtra). National Agroforestry Policy 2014 promotes this. (5) Crop diversification — Shift from rice-wheat to rice-maize-pulse system in IGP. (6) Protected cultivation — Polyhouse/shade net for vegetables reduces climate risk. NHM provides 50% subsidy for polyhouse construction.',
  'ICAR — National Innovations in Climate Resilient Agriculture (NICRA)',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'mech-001',
  'Farm Mechanization',
  'Custom Hiring Centers and Farm Mechanization',
  'Only 47% of Indian farms are mechanized (vs 90%+ in developed countries). Custom Hiring Centers (CHCs) address this by providing farm machinery on rental basis. Key machines: (1) Rotavator — Prepares seedbed in single pass, saves 30-35% fuel vs cultivator. ₹500-700/hour rental. (2) Zero-till drill/Happy Seeder — Direct sowing without tillage. Critical for managing paddy stubble. (3) Laser land leveler — Achieves precision leveling, saves 20-30% irrigation water. Cost: ₹600-800/hour. (4) Combined harvester — Harvests and threshes grain crops. ₹1,500-2,500/hour. (5) Drone sprayer — 10-16L capacity, covers 1 acre in 15 minutes. DGCA-approved for crop spraying. Government support: SMAM provides 40-50% subsidy on farm machinery. CHCs can be established under SMAM with 40% subsidy up to ₹25 lakh.',
  'Ministry of Agriculture — SMAM Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'mech-002',
  'Farm Mechanization',
  'Drones in Indian Agriculture',
  'Agricultural drones are transforming Indian farming for crop spraying, monitoring, and mapping. DGCA Kisan Drone guidelines (2022): (1) Spraying — Drones up to 25 kg MTOW can spray pesticides, fungicides, herbicides, and nano fertilizers. Coverage: 1 acre in 10-15 minutes vs 6-8 hours manual spraying. Chemical saving: 25-30% due to uniform coverage. Cost: ₹5-10 lakh for a professional spraying drone. (2) Crop monitoring — Multispectral and NDVI imaging for crop health assessment, stress detection, and yield estimation. (3) Mapping — Survey and mapping of farm boundaries, topography for precision farming. Government subsidies: 100% for SC/ST/small farmers, 75% for other farmers, 50% for FPOs and CHCs (up to ₹10 lakh). Pilot license (RPAS) or Remote Pilot Certificate required from DGCA-approved training organizations. Drone spraying is approved for 123 crops and 56 pesticide formulations.',
  'DGCA — Drone Guidelines for Agricultural Operations',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'animal-001',
  'Animal Husbandry',
  'Dairy Farming and Milk Production',
  'India is the world''s largest milk producer (~231 million tonnes in 2023-24). Key dairy breeds: Indigenous — Gir, Sahiwal, Tharparkar, Red Sindhi (produce 8-15 L/day). Cross-bred — HF cross, Jersey cross (15-25 L/day). Buffalo — Murrah (best milk breed, 10-16 L/day with 6.5% fat). Economics: A 10-buffalo unit (Murrah) produces ~100 L/day. With milk at ₹55-70/L, gross income is ₹1.5-2 lakh/month. Feed cost is ~60% of income. Silage, Total Mixed Ration (TMR), and mineral mixture supplementation increase yield by 15-20%. Government schemes: (1) RGM (Rashtriya Gokul Mission) — Breed improvement through AI, provides liquid nitrogen, semen, and AI kits. (2) DIDF — ₹11,000 crore fund for dairy cooperatives. (3) NDP-II — National Dairy Plan for productivity enhancement. (4) KCC extended to dairy farmers for loans up to ₹1.6 lakh.',
  'NDDB — Dairy Development Guidelines and Schemes',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'digital-001',
  'Digital Agriculture',
  'Agri-Tech Apps and Digital Tools for Indian Farmers',
  'Key digital tools for Indian farmers: (1) Kisan Suvidha App — Provides weather forecasts, market prices, plant protection, agri advisories, and extreme weather alerts for all districts. (2) IFFCO Kisan App — Agricultural advisory, market prices, and mandi rates. Voice-based advisory in 11 languages. (3) Meghdoot App — IMD weather forecasts and agromet advisories. (4) Crop Insurance (PMFBY) App — Crop loss reporting, claim status, and CCE data. (5) Mandi Bhav App — Real-time commodity prices from mandis across India. (6) AgriMarket — Within 50 km radius mandi prices. (7) CHC Farm Machinery App — Find and book custom hiring centers. (8) Pusa Krishi App — IARI technologies and varieties information. (9) e-NAM Mobile App — Online mandi trading. (10) Soil Health Card App — View soil test results and fertilizer recommendations. All apps are free and available on Google Play Store and Apple App Store.',
  'Digital Agriculture Division — Ministry of Agriculture',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'spice-001',
  'Spice Cultivation',
  'Turmeric, Chilli, and Spice Cultivation',
  'India is the world''s largest producer, consumer, and exporter of spices. Key spice crops: (1) Turmeric — Major states: Telangana, AP, Tamil Nadu, Maharashtra. Varieties: Erode local, Salem, Rajapore, Lakadong. Plant rhizome pieces (25-30g) in May-June at 45x15 cm spacing. Harvest at 7-9 months when leaves dry. Yield: 20-25 tonnes fresh/ha (4-5 tonnes dried). Process: boil for 45 min, dry for 10-15 days, polish in drum. Curcumin content determines quality (3-5% is premium). (2) Chilli — Varieties: Byadgi (Karnataka), Guntur Sannam (AP), Teja (AP), Jwala (Gujarat). Transplant 35-day seedlings at 60x45 cm. NPK: 120:60:60. Major pest: thrips and mites. Yield: 2-3 tonnes dried/ha. (3) Black Pepper — Kerala, Karnataka, Tamil Nadu. Vine crop grown on live standards. Yields: 2-5 kg dried pepper/vine. India exports ₹25,000+ crore worth of spices annually.',
  'Spices Board India — Spice Crop Production Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'fish-001',
  'Fisheries',
  'Inland Fish Farming and PMMSY',
  'India is the third-largest fish producer globally and second in aquaculture. Inland fisheries contribute 70% of total fish production. Key species: (1) Indian Major Carps — Catla, Rohu, Mrigal — composite fish culture yields 6-8 tonnes/ha/year. (2) Pangasius — Fast growing, yields 40-60 tonnes/ha/year in intensive systems. (3) Tilapia — GIFT strain, grows to 500g in 6 months. (4) Shrimp — Vannamei (Litopenaeus vannamei), cultured in coastal AP, Gujarat, Tamil Nadu. Yield: 8-10 tonnes/ha/crop (2 crops/year). Revenue: ₹6-10 lakh/ha/crop. PMMSY (Pradhan Mantri Matsya Sampada Yojana) — ₹20,050 crore scheme providing 40-60% subsidy for: pond construction, hatchery, feed mills, cages, biofloc units, and ornamental fish breeding. Biofloc technology: Tank-based intensive fish farming. KCC now available for fishermen up to ₹2 lakh at 4% interest.',
  'Department of Fisheries — PMMSY Operational Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'bee-001',
  'Beekeeping',
  'Beekeeping as Additional Farm Income',
  'Beekeeping (apiculture) provides dual benefits: honey production + crop pollination (increases crop yield by 20-40%). Key honey bee species in India: Apis cerana indica (Indian bee, manageable, lower yield 5-8 kg/colony/year), Apis mellifera (Italian bee, most popular for commercial beekeeping, 25-40 kg/colony/year). Starting a 10-colony apiary: Cost ₹35,000-50,000 (hives, colonies, equipment). Annual honey production: 250-400 kg. At ₹200-350/kg (organic/branded), annual income: ₹50,000-1,40,000 from 10 colonies. National Beekeeping and Honey Mission (NBHM) provides subsidies: ₹800/hive (A. cerana), ₹1,600/hive (A. mellifera). State agriculture departments conduct free training through KVKs. Bee colonies can be rented to orchards/farmers for pollination services at ₹500-1,500/colony/season.',
  'NBHM — National Beekeeping and Honey Mission',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'seed-001',
  'Seed Technology',
  'Seed Selection and Treatment Guidelines',
  'Quality seeds can increase yield by 15-25% compared to farm-saved seeds. Seed selection guidelines: (1) Always buy certified seeds from government agencies (NSC, state seed corporations), IARI, or ICAR-authorized dealers. (2) Check seed tag — Blue tag (Certified), White tag (Truthfully Labeled), Golden tag (Foundation), Purple tag (Breeder). (3) Minimum germination: Paddy/Wheat 80%, Vegetables 70%, Pulses 75%. (4) Seed replacement rate (SRR) targets: Rice 35%, Wheat 33%, Pulses 25%. Seed treatment: (1) Fungicide — Carbendazim 50WP or Thiram 75WP @ 2g/kg seed for fungal diseases. (2) Insecticide — Imidacloprid 600FS @ 5ml/kg for sucking pest protection (60 days). (3) Bio-agent — Trichoderma viride @ 4g/kg + Pseudomonas fluorescens @ 10g/kg for integrated disease management. (4) Rhizobium/Azotobacter inoculation for pulses and cereals respectively.',
  'National Seeds Corporation — Seed Production and Quality Control',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'advice-001',
  'Practical Farming Advice',
  'Crop Rotation and Intercropping Benefits',
  'Crop rotation and intercropping are time-tested practices that improve soil health, reduce pest buildup, and increase total farm income. Recommended rotations in India: (1) Rice-Wheat system (IGP) → Introduce pulse (moong/masur) or potato in between. (2) Rice-Rice (southern India) → Rice-Pulse or Rice-Vegetable for soil nitrogen replenishment. (3) Cotton-Wheat → Include pigeonpea or soybean in rotation. (4) Sugarcane (18 months) → Follow with wheat/mustard for soil recovery. Intercropping benefits: Sugarcane + onion/garlic (additional ₹30,000-50,000/ha income), Maize + soybean (1:1 or 2:2 row ratio), Coconut + pepper + banana (multi-tier), Pigeonpea + sorghum (2:1). Advantages: 20-30% higher total productivity (Land Equivalent Ratio > 1), natural pest suppression, insurance against crop failure, and better utilization of water and sunlight.',
  'ICAR — Cropping Systems Research Manual',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'advice-002',
  'Practical Farming Advice',
  'Farm Record Keeping and Financial Planning',
  'Maintaining farm records helps in better decision-making, loan applications, insurance claims, and tax compliance. Essential records: (1) Crop register — Season, crop, area, variety, sowing/harvest dates, yield. (2) Input register — Seeds, fertilizers, pesticides purchased with quantities, costs, and dates. (3) Labor register — Hired labor days, wages paid. (4) Sales register — Produce sold, quantity, price, buyer, and payment received. (5) Asset register — Machinery, equipment, livestock with purchase date and cost. (6) Bank/loan statement — KCC usage, repayment, interest. Financial planning tips: Calculate cost of production per kg for each crop, aim for minimum 50% return on investment. Set aside 10% of crop income for next season''s inputs. Maintain a contingency fund (2-3 months'' family expenses). Track input costs to identify where expenses can be reduced.',
  'MANAGE Hyderabad — Farm Business Management Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'platform-001',
  'FarmNexus Platform',
  'How to List and Sell Produce on FarmNexus',
  'FarmNexus is a peer-to-peer digital marketplace connecting Indian farmers directly with buyers. To sell produce: (1) Register as a Farmer on FarmNexus with your name, location, and phone number. (2) Navigate to Dashboard → Listings → Create New Listing. (3) Fill in: Crop category (vegetable, fruit, grain, dairy, spice), produce name, quantity (kg), price per kg, minimum order quantity, available date, and farm location. (4) Upload clear photos of your produce — multiple photos increase buyer confidence. (5) Use the AI Price Advisor to get a fair market price suggestion based on current mandi rates. (6) Once published, your listing appears on the Buyer marketplace map and grid. Buyers can browse, search, and place orders directly. (7) You receive order notifications and can chat directly with buyers through the order-based messaging system. (8) Track all orders, revenue, and analytics from your Farmer Dashboard. FarmNexus eliminates middlemen, enabling 20-40% better prices for farmers.',
  'FarmNexus Platform Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'platform-002',
  'FarmNexus Platform',
  'Using FarmNexus AI Features',
  'FarmNexus offers several AI-powered tools for farmers: (1) AI Price Advisor — When creating a listing, click "Get AI Price Suggestion" to receive a fair wholesale price recommendation based on the crop, category, and quantity. The AI analyzes current Indian mandi rates and seasonal trends. (2) Farm Assistant Chat — On the Dashboard, use the AI chat to ask questions about crop cultivation, pest management, storage, weather, pricing strategy, and more. The assistant is specialized for Indian farming conditions. (3) Crop Health Scanner — Upload a photo of your crop to detect diseases and get treatment suggestions. The AI identifies issues, rates severity, and recommends organic and chemical remedies. (4) Crop Damage Assessment — Report crop losses from floods, drought, hail, or pests. Upload damage photos and get AI-powered loss estimates, recovery suggestions, and insurance guidance (PMFBY). (5) Smart Buyer Search — Buyers can search in natural language like "organic mangoes under ₹100/kg in Guntur" and the AI parses it into structured filters.',
  'FarmNexus Platform Guide',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'welfare-001',
  'Farmer Welfare',
  'Agricultural Credit and Loan Facilities',
  'Agricultural credit in India: (1) Short-term crop loans (KCC) — Up to ₹3 lakh at 4% effective rate (7% minus 3% subvention for timely repayment). (2) Medium-term loans (3-5 years) — For farm machinery, dairy, poultry. Interest: 8-10% through commercial banks. (3) Long-term investment credit — For land development, orchards, cold storage. NABARD refinances through cooperative banks and RRBs. (4) Agri-Infrastructure Fund (AIF) — ₹1 lakh crore fund for post-harvest infrastructure. Interest subvention of 3% up to ₹2 crore, plus CGTMSE credit guarantee. Apply through banks or agriinfra.dac.gov.in. (5) PMEGP — For agri-based micro enterprises. Subsidy: 25-35% for projects up to ₹50 lakh. (6) Self-Help Groups (SHGs) — Can avail bank loans through SHG-Bank Linkage Programme. (7) Mudra Loans — Shishu (up to ₹50,000), Kishore (up to ₹5 lakh), Tarun (up to ₹10 lakh) for agri-allied micro enterprises.',
  'NABARD — Agricultural Credit and Finance Guidelines',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'flori-001',
  'Floriculture',
  'Commercial Flower Farming in India',
  'India''s floriculture industry is valued at ₹34,000 crore with significant growth potential. Major flowers: (1) Marigold — Most popular loose flower. Varieties: Pusa Narangi Gainda, African Giant. Planted in all seasons except peak summer. Yield: 15-20 tonnes/ha. Revenue: ₹3-8 lakh/ha. (2) Rose — Cut flower and loose flower varieties. Polyhouse rose production yields 250-350 stems/sqm/year. Revenue in polyhouse: ₹50-80 lakh/ha/year. (3) Jasmine — Madurai Malli, Mysore Mallige, Gundu Malli. Yield: 8-10 tonnes/ha. Revenue: ₹4-6 lakh/ha. (4) Chrysanthemum — Popular for festivals and weddings. Yield: 15-20 tonnes/ha. Protected cultivation: Polyhouse floriculture for roses, gerbera, carnation, and orchids is highly profitable. NHM provides 50% subsidy for polyhouse construction. Export: ₹700+ crore, mainly dry flowers and live plants. Processing: dried flowers, essential oils, natural dyes.',
  'NHB — Floriculture Development Scheme',
  NULL
);

INSERT INTO public.knowledge_chunks (id, topic, title, content, source, embedding) VALUES (
  'land-001',
  'Land & Legal',
  'Digital Land Records and DILRMP',
  'Digital India Land Records Modernization Programme (DILRMP) aims to digitize all land records across India. Key portals by state: (1) AP — Meebhoomi (meebhoomi.ap.gov.in) — Pahani/Adangal, 1B/passbook. (2) Telangana — Dharani (dharani.telangana.gov.in) — Pattadar passbook, mutation. (3) Karnataka — Bhoomi (landrecords.karnataka.gov.in) — RTC (Record of Rights, Tenancy, and Crops). (4) UP — BhuLekh (upbhulekh.gov.in) — Khatauni. (5) Maharashtra — BhumiAbhilekh/7/12 extract (bhulekh.mahabhumi.gov.in). (6) Tamil Nadu — Patta/Chitta (eservices.tn.gov.in). Land records are essential for: KCC loans, crop insurance (PMFBY), PM-KISAN registration, and organic certification. SVAMITVA scheme uses drone survey to provide property cards (Sampatti cards) in rural areas — 1.5 crore+ cards distributed.',
  'Department of Land Resources — DILRMP Portal',
  NULL
);