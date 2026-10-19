import re
import json

with open('scratch/part_three_raw.txt', 'r', encoding='utf-8') as f:
    content = f.read()

chapter_names = [
    ("1", "One", "Luxury Hotels (5-star & 4-star, luxury resorts)"),
    ("2", "Two", "Tourist Hotels (1, 2, 3-star, hotel apartments, motels)"),
    ("3", "Three", "Shopping Malls & Commercial Centers"),
    ("4", "Four", "Important Complexes (Multi-use, residential & commercial complexes)"),
    ("5", "Five", "Labor Accommodations / Workers Residential Compounds"),
    ("6", "Six", "Cinemas and Theaters"),
    ("7", "Seven", "Amusement Parks, Theme Parks & Water Parks"),
    ("8", "Eight", "Educational Facilities (Universities, Colleges, Schools, Nurseries)"),
    ("9", "Nine", "Healthcare Facilities (Hospitals, Clinics, Medical Centers, Day Surgery)"),
    ("10", "Ten", "Non-Muslim Places of Worship (Churches, Temples)"),
    ("11", "Eleven", "Manufacture & Sale of Precious Metals and Gemstones (Jewelry, Gold shops, Refineries)"),
    ("12", "Twelve", "Financial & Monetary Institutions (Banks, Exchange houses, ATMs, Money transfer)"),
    ("13", "Thirteen", "Sports & Recreational Halls and Fitness Clubs"),
    ("14", "Fourteen", "Gas Stations / Fuel Service Stations"),
    ("15", "Fifteen", "Large & Diverse Stores (Supermarkets, Hypermarkets, Department stores, Electronics)"),
    ("16", "Sixteen", "Electronic Games & Entertainment Halls and Arenas (Gaming centers, VR, Arcades)"),
    ("17", "Seventeen", "Football Clubs & Sports Stadiums"),
    ("18", "Eighteen", "Warehouse Compounds & Logistics Parks"),
    ("19", "Nineteen", "Individual Warehouses & Storage Facilities"),
    ("20", "Twenty", "Self-Storage Facilities"),
    ("21", "Twenty-One", "Air Cargo & Freight Forwarding Terminals"),
    ("22", "Twenty-Two", "Factories & Industrial Manufacturing Plants"),
    ("23", "Twenty-Three", "Vacation Homes / Holiday Homes (Short-term rental properties)"),
    ("24", "Twenty-Four", "Shooting Ranges (Live ammunition & Laser/Airgun ranges)"),
    ("25", "Twenty-Five", "Art Galleries & Antique Exhibitions"),
    ("26", "Twenty-Six", "Vehicle Rental Shops (Car rental agencies)"),
    ("27", "Twenty-Seven", "Tobacco Retail Stores (Shisha/Smoking accessories)"),
    ("28", "Twenty-Eight", "Precious Goods Stores (Luxury watches, Art, Collectibles, High-value retail)"),
    ("29", "Twenty-Nine", "Data Centers & Cloud Server Facilities"),
    ("30", "Thirty", "Pharmacies & Drug Stores"),
    ("31", "Thirty-One", "Massage & Spa Centers"),
    ("32", "Thirty-Two", "Parking Rental & Management Facilities (Multi-story, Public parking)"),
    ("33", "Thirty-Three", "Auction Halls (Motor vehicle, Real estate, Luxury auctions)"),
    ("34", "Thirty-Four", "Customer Happiness Centers (Government & Semi-government service centers)"),
    ("35", "Thirty-Five", "Business Centers & Co-working Spaces"),
    ("36", "Thirty-Six", "Quran Memorization Centers & Islamic Institutions"),
    ("37", "Thirty-Seven", "Charitable Organizations & Humanitarian Associations"),
    ("38", "Thirty-Eight", "Hunting Equipment & Weaponry Stores")
]

detailed_chapters = []

for num_str, ch_name, full_title in chapter_names:
    pattern = rf"(Chapter\s+{ch_name}:[\s\S]*?)(?=Chapter\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Twenty-One|Twenty-Two|Twenty-Three|Twenty-Four|Twenty-Five|Twenty-Six|Twenty-Seven|Twenty-Eight|Twenty-Nine|Thirty|Thirty-One|Thirty-Two|Thirty-Three|Thirty-Four|Thirty-Five|Thirty-Six|Thirty-Seven|Thirty-Eight|Thirty-Nine|Forty)|\Z)"
    match = re.search(pattern, content, re.IGNORECASE)
    if match:
        raw_text = match.group(1).strip()
        
        # Clean header lines
        cleaned_text = re.sub(r'Preventive Systems Manual.*?\n', '', raw_text)
        cleaned_text = re.sub(r'Administrative Resolution No\..*?\n', '', cleaned_text)
        cleaned_text = re.sub(r'Page \d+ of \d+\s*\n', '', cleaned_text)
        
        detailed_chapters.append({
            "chapter_number": int(num_str),
            "chapter_name": ch_name,
            "target_facility": full_title,
            "raw_text": cleaned_text
        })

with open('scratch/all_38_chapters_cleaned.json', 'w', encoding='utf-8') as f:
    json.dump(detailed_chapters, f, indent=2, ensure_ascii=False)

print(f"Successfully processed all {len(detailed_chapters)} chapters.")
