import os
import re
import requests
import pandas as pd
import time
import urllib3

# Απενεργοποίηση των warnings λόγω του verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- ΚΕΝΤΡΙΚΕΣ ΡΥΘΜΙΣΕΙΣ ---
API_HOST = "https://tinwise.ngnc.gr:8902/chat"

MOODLE_TOKEN = "" 
PHPSESSID = "p31fni08blhnb46p0175a8rg6"  

LANG = "el"
EXCEL_FILE = "TinWise Chatbot_GR.xlsx"

if not os.path.exists(EXCEL_FILE) and os.path.exists("TinWise Chatbot_GR.xls"):
    EXCEL_FILE = "TinWise Chatbot_GR.xls"

def fetch_bot_response(question, user_type, previous_answer=None):
    """Στέλνει την ερώτηση στο API προσομοιώνοντας τον Browser."""
    payload = {
        "message": question,
        "type": user_type,
        "lang": LANG
    }
    
    payload["token"] = MOODLE_TOKEN if MOODLE_TOKEN.strip() != "" else None
    payload["previous_answer"] = previous_answer if previous_answer else None

    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://tinwise.ngnc.gr',
        'Referer': 'https://tinwise.ngnc.gr/'
    }
    
    cookies = {"PHPSESSID": PHPSESSID}
    if MOODLE_TOKEN and MOODLE_TOKEN.strip() != "":
        cookies["moodle_token"] = MOODLE_TOKEN
    
    try:
        response = requests.post(API_HOST, json=payload, headers=headers, cookies=cookies, timeout=30, verify=False)
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            links = re.findall(r'href="([^"]+)"', reply)
            return reply, ", ".join(links) if links else ""
        else:
            return f"Error: HTTP {response.status_code}", ""
    except Exception as e:
        return f"Error: Connection Failed ({e})", ""

def sync_chatbot_data():
    print("--- ΕΚΚΙΝΗΣΗ ΕΛΛΗΝΙΚΟΥ ΣΥΓΧΡΟΝΙΣΜΟΥ (ΣΤΟΧΕΥΣΗ ΑΡΙΣΤΕΡΩΝ ΣΤΗΛΩΝ) ---")
    if not os.path.exists(EXCEL_FILE):
        print(f"To αρχείο Excel '{EXCEL_FILE}' δεν βρέθηκε!")
        return

    df = pd.read_excel(EXCEL_FILE)
    question_col = df.columns[0]
    
    executed_questions = 0
    
    for index, row in df.iterrows():
        question = str(row[question_col]).strip()
        
        if not question or question == "nan" or "questions" in question.lower() or "ερωτήσεις" in question.lower():
            continue
            
        if "σφυρίζουσες εμβοές" in question.lower() or "παλμικές εμβοές" in question.lower():
            current_user_type = "c"
            role_label = "Clinician"
        else:
            current_user_type = "p"
            role_label = "Patient"
        
        print(f"\n[{role_label}] ΕΚΤΕΛΕΣΗ ΔΟΚΙΜΗΣ -> Ερώτηση {index+1}: {question[:50]}...")
        
        last_reply = None
        all_links = []
        
        # Τρέχουμε 10 φορές για τις 10 απαντήσεις
        for i in range(1, 11):
            print(f"  -> Λήψη Answer {i} στα Ελληνικά...")
            reply, links = fetch_bot_response(question, current_user_type, previous_answer=last_reply)
            
            # ΑΛΛΑΓΗ: Αντί για το όνομα της στήλης, γράφουμε απευθείας με βάση τον αριθμό της στήλης.
            # i = 1 (Answer 1) -> πάει στη στήλη 1 (δηλαδή τη 2η στήλη, τη Β)
            # i = 2 (Answer 2) -> πάει στη στήλη 2 (δηλαδή την 3η στήλη, τη C)
            df.iloc[index, i] = reply
            
            if "Error:" not in str(reply):
                last_reply = reply
                
            if links:
                all_links.append(links)
                
            time.sleep(0.6)
        
        # Βάζουμε τα links στη στήλη O (θέση 14 στο Excel, αν μετρήσεις A=0, B=1... O=14)
        if len(df.columns) > 14:
            if all_links:
                combined = ", ".join(all_links).split(", ")
                unique = list(set([lnk.strip() for lnk in combined if lnk.strip()]))
                df.iloc[index, 14] = ", ".join(unique)
            else:
                df.iloc[index, 14] = ""
                
        executed_questions += 1
        if executed_questions >= 1:
            print("\n[INFO] Η δοκιμαστική ερώτηση ολοκληρώθηκε.")
            break
            
    df.to_excel(EXCEL_FILE, index=False)
    print("[SUCCESS] Το αρχείο Excel ενημερώθηκε στα αριστερά κουτάκια!")

if __name__ == "__main__":
    sync_chatbot_data()