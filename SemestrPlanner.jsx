import React, { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Calendar, List, Users, Bell, Plus, Check, X, MessageSquare, LayoutGrid,
  AlertTriangle, ChevronLeft, ChevronRight, Clock, Shield, User, Send,
  Radio, Inbox, Download, Upload, MapPin, ArrowRight, Wifi
} from "lucide-react";

const RAW_EVENTS = [{"id": 1, "month": 10, "day": 1, "weekday": "środa", "cat": "UE", "title": "INAUGURACJA ŚRODOWISKOWA", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria", "Hubert", "Karola", "Kuba"], "time": null}, {"id": 2, "month": 10, "day": 1, "weekday": "środa", "cat": "SSUEW", "title": "Rekrutacja", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria", "Hubert", "Karola", "Kuba"], "time": null}, {"id": 3, "month": 10, "day": 1, "weekday": "środa", "cat": "PROJEKTY", "title": "Dni Adaptacyjne", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria", "Hubert", "Karola", "Kuba"], "time": null}, {"id": 4, "month": 10, "day": 2, "weekday": "czwartek", "cat": "PROJEKTY", "title": "Dni Adaptacyjne + UE PARTY", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria", "Hubert", "Karola", "Kuba"], "time": null}, {"id": 5, "month": 10, "day": 3, "weekday": "piątek", "cat": "APLIKACJE", "title": "KG BALU", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria"], "time": null}, {"id": 6, "month": 10, "day": 4, "weekday": "sobota", "cat": "PROJEKTY", "title": "Dni Adaptacyjne", "people": ["Daria", "Marcel", "Jula", "Miki", "Ćwikła", "Madzia"], "time": null}, {"id": 7, "month": 10, "day": 6, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "PROMKA - 18:00 - 9J", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia"], "time": "18:00"}, {"id": 8, "month": 10, "day": 7, "weekday": "wtorek", "cat": "UE", "title": "TARGI ORGANIZACJI", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Kuba"], "time": null}, {"id": 9, "month": 10, "day": 7, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Kuba"], "time": null}, {"id": 10, "month": 10, "day": 8, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE REKRUTACJI", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Kuba"], "time": null}, {"id": 11, "month": 10, "day": 8, "weekday": "środa", "cat": "INNE", "title": "DZIEŃ ZDROWIA PSYCHICZNEGO", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Kuba"], "time": null}, {"id": 12, "month": 10, "day": 9, "weekday": "czwartek", "cat": "UE", "title": "Inauguracja Roku Akademickiego", "people": ["wszyscy"], "time": null}, {"id": 13, "month": 10, "day": 9, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "HR - 18:00 - 9J", "people": ["wszyscy"], "time": "18:00"}, {"id": 14, "month": 10, "day": 9, "weekday": "czwartek", "cat": "INNE", "title": "KONWENT", "people": ["wszyscy"], "time": null}, {"id": 15, "month": 10, "day": 10, "weekday": "piątek", "cat": "APLIKACJE", "title": "KG MOSTY EKONOMICZNE", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria"], "time": null}, {"id": 16, "month": 10, "day": 12, "weekday": "niedziela", "cat": "APLIKACJE", "title": "ZARZĄD BAL", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Daria"], "time": null}, {"id": 17, "month": 10, "day": 13, "weekday": "poniedziałek", "cat": "ZEBRANIA", "title": "SKS 18:00 - 120 A", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Hubert"], "time": "18:00"}, {"id": 18, "month": 10, "day": 13, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "FINANSE - 17:00 28J", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Hubert"], "time": "17:00"}, {"id": 19, "month": 10, "day": 14, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "ZEBRANIE REKRUTACJI", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia"], "time": null}, {"id": 20, "month": 10, "day": 15, "weekday": "środa", "cat": "UE", "title": "Targi Pracy", "people": ["wszyscy"], "time": null}, {"id": 21, "month": 10, "day": 15, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 22, "month": 10, "day": 16, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "DIJK - 17:00 9J", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Karola"], "time": "17:00"}, {"id": 23, "month": 10, "day": 17, "weekday": "piątek", "cat": "SSUEW", "title": "ZJAZD FUE WARSZAWA", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Karola"], "time": null}, {"id": 24, "month": 10, "day": 17, "weekday": "piątek", "cat": "ZEBRANIA", "title": "ZEBRANIE REKRUTACJI", "people": ["Marcel", "Jula", "Miki", "Ćwikła", "Madzia", "Karola"], "time": null}, {"id": 25, "month": 10, "day": 19, "weekday": "niedziela", "cat": "INNE", "title": "INTEGRACJA ZE ŚWIEŻAKAMI", "people": ["wszyscy"], "time": null}, {"id": 26, "month": 10, "day": 20, "weekday": "poniedziałek", "cat": "SSUEW", "title": "TYDZIEŃ Z SAMORZĄDEM", "people": ["Ćwikła", "Madzia"], "time": null}, {"id": 27, "month": 10, "day": 21, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "RUSS 18:00 205A", "people": ["Ćwikła", "Marcel", "Daria"], "time": "18:00"}, {"id": 28, "month": 10, "day": 22, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 29, "month": 10, "day": 23, "weekday": "czwartek", "cat": "PROJEKTY", "title": "ODPRAWA JWK", "people": ["Marcel", "Karol", "Daria"], "time": null}, {"id": 30, "month": 10, "day": 23, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "KZ - 18:00 - 28 J", "people": ["Marcel", "Karol", "Daria"], "time": "18:00"}, {"id": 31, "month": 10, "day": 23, "weekday": "czwartek", "cat": "APLIKACJE", "title": "TEAM BAL", "people": ["Marcel", "Karol", "Daria"], "time": null}, {"id": 32, "month": 10, "day": 24, "weekday": "piątek", "cat": "PROJEKTY", "title": "JWK", "people": ["Marcel"], "time": null}, {"id": 33, "month": 10, "day": 27, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "SPEEDATING - 16:30 - 113 Z", "people": ["Marcel"], "time": "16:30"}, {"id": 34, "month": 10, "day": 28, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "ADMI - 18:00 - 9J", "people": ["Marcel", "Miki"], "time": "18:00"}, {"id": 35, "month": 10, "day": 28, "weekday": "wtorek", "cat": "APLIKACJE", "title": "KG WIGILIA", "people": ["Marcel", "Miki"], "time": null}, {"id": 36, "month": 10, "day": 29, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 37, "month": 10, "day": 30, "weekday": "czwartek", "cat": "APLIKACJE", "title": "ZARZĄD MOSTY", "people": ["Daria"], "time": null}, {"id": 38, "month": 10, "day": 31, "weekday": "piątek", "cat": "UE", "title": "DZIEŃ REKTORSKI", "people": [], "time": null}, {"id": 39, "month": 11, "day": 3, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "FINANSE - 17:00 SZKOLENIE, 18:00 ZEBRANIE 9J", "people": ["Daria", "Hubert"], "time": "17:00"}, {"id": 40, "month": 11, "day": 3, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "KG TEDX", "people": ["Daria", "Hubert"], "time": null}, {"id": 41, "month": 11, "day": 4, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "SKS 19:00 205 A", "people": ["Ćwikła", "Daria"], "time": "19:00"}, {"id": 42, "month": 11, "day": 4, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "SZKOLENIE Z APEK I ROZMÓW - 17:00 - 205 A", "people": ["Ćwikła", "Daria"], "time": "17:00"}, {"id": 43, "month": 11, "day": 5, "weekday": "środa", "cat": "UE", "title": "\"Pink & Blue\"", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 44, "month": 11, "day": 5, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 45, "month": 11, "day": 5, "weekday": "środa", "cat": "APLIKACJE", "title": "UE PARTY", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 46, "month": 11, "day": 6, "weekday": "czwartek", "cat": "SSUEW", "title": "STUDENCKIE FORUM JAKOŚCI", "people": ["Karola", "Daria", "Ćwikła"], "time": null}, {"id": 47, "month": 11, "day": 6, "weekday": "czwartek", "cat": "PROJEKTY", "title": "TWE", "people": ["Karola", "Daria", "Ćwikła"], "time": null}, {"id": 48, "month": 11, "day": 9, "weekday": "niedziela", "cat": "APLIKACJE", "title": "TEAM WIGILIA", "people": ["Marcel", "Karola"], "time": null}, {"id": 49, "month": 11, "day": 12, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy", "Daria"], "time": null}, {"id": 50, "month": 11, "day": 12, "weekday": "środa", "cat": "APLIKACJE", "title": "TEAM MOSTY", "people": ["wszyscy", "Daria"], "time": null}, {"id": 51, "month": 11, "day": 13, "weekday": "czwartek", "cat": "ZEBRANIA", "title": "RUSS 18:00 205 A", "people": ["Ćwikła"], "time": "18:00"}, {"id": 52, "month": 11, "day": 17, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "DIJK - SZKOLENIE 17:00, 18:00 ZEBRANIE - 9J", "people": ["Kuba", "Karola", "Daria"], "time": "17:00"}, {"id": 53, "month": 11, "day": 17, "weekday": "poniedziałek", "cat": "INNE", "title": "ĆWICZENIA RELKSACYJNE - 19:00 - 9 J", "people": ["Kuba", "Karola", "Daria"], "time": "19:00"}, {"id": 54, "month": 11, "day": 17, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "ZARZĄD TEDX", "people": ["Kuba", "Karola", "Daria"], "time": null}, {"id": 55, "month": 11, "day": 18, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "KZ SZKOLENIE -17:00 ZEBRANIE 18:00 - 9J", "people": ["Karol"], "time": "17:00"}, {"id": 56, "month": 11, "day": 19, "weekday": "środa", "cat": "UE", "title": "Integration Day", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 57, "month": 11, "day": 19, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 58, "month": 11, "day": 19, "weekday": "środa", "cat": "ZEBRANIA/INNE", "title": "SPOTKANIE FRIS - 18:00", "people": ["Kuba", "wszyscy"], "time": "18:00"}, {"id": 59, "month": 11, "day": 20, "weekday": "czwartek", "cat": "SSUEW", "title": "Dzień studenta", "people": ["Miki", "Marcel"], "time": null}, {"id": 60, "month": 11, "day": 20, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "ADMI + SZKOLENIE - 17:00 - 9J", "people": ["Miki", "Marcel"], "time": "17:00"}, {"id": 61, "month": 11, "day": 20, "weekday": "czwartek", "cat": "APLIKACJE", "title": "KG PRZYDZIAŁKI", "people": ["Miki", "Marcel"], "time": null}, {"id": 62, "month": 11, "day": 21, "weekday": "piątek", "cat": "PROJEKTY", "title": "FINAŁ TWE", "people": ["Ćwikła", "Karola"], "time": null}, {"id": 63, "month": 11, "day": 24, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "HR - 17:00 SZKOLENIE, 18:00 ZEBRANIE - 9J", "people": ["Marcel"], "time": "17:00"}, {"id": 64, "month": 11, "day": 25, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "PROMOCJA - 17:00 SZKOLENIE, 18:00 ZEBRANIE", "people": ["Jula"], "time": "17:00"}, {"id": 65, "month": 11, "day": 26, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 66, "month": 11, "day": 27, "weekday": "czwartek", "cat": "PROJEKTY", "title": "ZJAZD FUE z galą", "people": ["Ćwikła", "Karola"], "time": null}, {"id": 67, "month": 11, "day": 27, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "SZKOLENIE KZ - 18:00 9J", "people": ["Ćwikła", "Karola"], "time": "18:00"}, {"id": 68, "month": 12, "day": 1, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "SZKOLENIE \"JAK ZROBIĆ CV, KTÓRE NIE BĘDZIE ŚCIEKIEM?\" - 205A- 17:00", "people": ["Marcel"], "time": "17:00"}, {"id": 69, "month": 12, "day": 1, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "TEAM PRZYDZIAŁKI", "people": ["Marcel"], "time": null}, {"id": 70, "month": 12, "day": 2, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "SZKOLENIE KALENDARZ, TRELLO, LINKEDIN - 18:30 - 205A", "people": ["Jula", "Karol", "wszyscy"], "time": "18:30"}, {"id": 71, "month": 12, "day": 2, "weekday": "wtorek", "cat": "INNE", "title": "SZKOLENIE KZ X PROMKA - 17:00 - 205A", "people": ["Jula", "Karol", "wszyscy"], "time": "17:00"}, {"id": 72, "month": 12, "day": 3, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 73, "month": 12, "day": 4, "weekday": "czwartek", "cat": "ZEBRANIA", "title": "SKS - 205A - 18:00 + J", "people": ["Ćwikła", "Kuba"], "time": "18:00"}, {"id": 74, "month": 12, "day": 4, "weekday": "czwartek", "cat": "INNE", "title": "MIKOŁAJKI", "people": ["Ćwikła", "Kuba"], "time": null}, {"id": 75, "month": 12, "day": 8, "weekday": "poniedziałek", "cat": "UE", "title": "ZIMOWA SESJA NA IV ROKU ZIIPU", "people": ["Kuba", "Karola", "Jula"], "time": null}, {"id": 76, "month": 12, "day": 8, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "DIJK - 17:00 - 28J + WIGILIA", "people": ["Kuba", "Karola", "Jula"], "time": "17:00"}, {"id": 77, "month": 12, "day": 8, "weekday": "poniedziałek", "cat": "INNE", "title": "PROMKA - 17:00 9J + WIGILIA", "people": ["Kuba", "Karola", "Jula"], "time": "17:00"}, {"id": 78, "month": 12, "day": 9, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "SZKOLENIE DLA ŚWIEŻAKÓW - KOMUNIKACJA I DiJKowy NIEZBĘDNIK STUDENTA - 9J - 18:00", "people": ["Kuba", "Karola"], "time": "18:00"}, {"id": 79, "month": 12, "day": 9, "weekday": "wtorek", "cat": "INNE", "title": "DZIEŃ GIER PLANSZOWYCH", "people": ["Kuba", "Karola"], "time": null}, {"id": 80, "month": 12, "day": 10, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 81, "month": 12, "day": 11, "weekday": "czwartek", "cat": "PROJEKTY", "title": "odprawa wigilii", "people": ["Ćwikła", "Marcel"], "time": null}, {"id": 82, "month": 12, "day": 11, "weekday": "czwartek", "cat": "ZEBRANIA", "title": "RUSS - 205A - 18:00 + J", "people": ["Ćwikła", "Marcel"], "time": "18:00"}, {"id": 83, "month": 12, "day": 12, "weekday": "piątek", "cat": "PROJEKTY", "title": "WIGILIA", "people": ["Marcel", "Kuba"], "time": null}, {"id": 84, "month": 12, "day": 15, "weekday": "poniedziałek", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 85, "month": 12, "day": 15, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "KG WWK, KG REKRUTACJI", "people": ["wszyscy"], "time": null}, {"id": 86, "month": 12, "day": 16, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "FINANSE - 17:00 - 9J + WIGILIA", "people": [], "time": "17:00"}, {"id": 87, "month": 12, "day": 16, "weekday": "wtorek", "cat": "INNE", "title": "ADMI - 17:00 - 28J + WIGILIA", "people": [], "time": "17:00"}, {"id": 88, "month": 12, "day": 17, "weekday": "środa", "cat": "PROJEKTY", "title": "WIGILIA Z WŁADZAMI", "people": ["wszyscy"], "time": null}, {"id": 89, "month": 12, "day": 17, "weekday": "środa", "cat": "ZEBRANIA", "title": "WIGILIA ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 90, "month": 12, "day": 18, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "HR - 18:00 - 28J + WIGILIA", "people": ["Marcel", "Karol"], "time": "18:00"}, {"id": 91, "month": 12, "day": 18, "weekday": "czwartek", "cat": "INNE", "title": "KZ - 17:00 - 9J + WIGILIA", "people": ["Marcel", "Karol"], "time": "17:00"}, {"id": 92, "month": 12, "day": 23, "weekday": "wtorek", "cat": "UE", "title": "Przerwa świąteczna na UE", "people": [], "time": null}, {"id": 93, "month": 1, "day": 1, "weekday": "czwartek", "cat": "UE", "title": "Przerwa świąteczna na UE", "people": [], "time": null}, {"id": 94, "month": 1, "day": 2, "weekday": "piątek", "cat": "APLIKACJE", "title": "TEAM REKRUTACJI", "people": ["Marcel"], "time": null}, {"id": 95, "month": 1, "day": 7, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 96, "month": 1, "day": 7, "weekday": "środa", "cat": "APLIKACJE", "title": "TEAM WWK", "people": ["wszyscy"], "time": null}, {"id": 97, "month": 1, "day": 10, "weekday": "sobota", "cat": "ZEBRANIA/INNE", "title": "CASE STUDY PROMOCJA - 10:00 - 9J", "people": ["Jula"], "time": "10:00"}, {"id": 98, "month": 1, "day": 12, "weekday": "poniedziałek", "cat": "ZEBRANIA", "title": "SKS - 19:00 - 205A + J", "people": ["wszyscy"], "time": "19:00"}, {"id": 99, "month": 1, "day": 12, "weekday": "poniedziałek", "cat": "ZEBRANIA/INNE", "title": "FINANSE - 16:30 28J", "people": ["wszyscy"], "time": "16:30"}, {"id": 100, "month": 1, "day": 12, "weekday": "poniedziałek", "cat": "INNE", "title": "SPOTKANIE Z DZIEKANEM (ZDALNIE) - WCZEŚNIEJ SALA NA UE DLA WIDZÓW", "people": ["wszyscy"], "time": null}, {"id": 101, "month": 1, "day": 13, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "KZ + SZKOLENIE KZ x FINANSE - 18:00 - 9J", "people": ["Karol", "Hubert"], "time": "18:00"}, {"id": 102, "month": 1, "day": 14, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 103, "month": 1, "day": 14, "weekday": "środa", "cat": "INNE", "title": "DZIEŃ PIZZY", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 104, "month": 1, "day": 15, "weekday": "czwartek", "cat": "INNE", "title": "ĆWICZENIA RELAKSACYJNE - 19:00 - 9J", "people": ["Karola"], "time": "19:00"}, {"id": 105, "month": 1, "day": 17, "weekday": "sobota", "cat": "ZEBRANIA/INNE", "title": "CASE STUDY KZ - 10:00 - 9J", "people": ["Kuba", "Karol"], "time": "10:00"}, {"id": 106, "month": 1, "day": 17, "weekday": "sobota", "cat": "INNE", "title": "DZIEŃ PIZZY - ZAOCZNI", "people": ["Kuba", "Karol"], "time": null}, {"id": 107, "month": 1, "day": 19, "weekday": "poniedziałek", "cat": "INNE", "title": "SZKOLENIE - ZARZĄDZANIE PROJEKTAMI - 18:00 - 205A", "people": ["Marcel"], "time": "18:00"}, {"id": 108, "month": 1, "day": 20, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "RUSS - 18:00 - 205A", "people": ["Ćwikła", "Jula"], "time": "18:00"}, {"id": 109, "month": 1, "day": 20, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "PROMKA - 17:00, SZKOLENIE, 18:00 ZEBRANIE 9J", "people": ["Ćwikła", "Jula"], "time": "17:00"}, {"id": 110, "month": 1, "day": 21, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 111, "month": 1, "day": 22, "weekday": "czwartek", "cat": "PROJEKTY", "title": "ODPRAWA KPUE", "people": ["Karola", "Daria", "Marcel", "Madzia", "Miki"], "time": null}, {"id": 112, "month": 1, "day": 22, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "DIJK - 17:00, DiJKowe pogawędki - 18:00 - 28 J", "people": ["Karola", "Daria", "Marcel", "Madzia", "Miki"], "time": "17:00"}, {"id": 113, "month": 1, "day": 22, "weekday": "czwartek", "cat": "INNE", "title": "SZKOLENIE - LEADERSHIP AND TEAMWORK - 18:00 - 205A", "people": ["Karola", "Daria", "Marcel", "Madzia", "Miki"], "time": "18:00"}, {"id": 114, "month": 1, "day": 23, "weekday": "piątek", "cat": "PROJEKTY", "title": "KPUE WROCŁAW", "people": ["Ćwikła", "Madzia", "Miki"], "time": null}, {"id": 115, "month": 1, "day": 24, "weekday": "sobota", "cat": "INNE", "title": "INTEGRACJA Z ALUMNAMI", "people": ["Ćwikła", "Madzia", "Miki", "Marcel", "wszyscy"], "time": null}, {"id": 116, "month": 1, "day": 25, "weekday": "niedziela", "cat": "INNE", "title": "IKSS WOŚP", "people": ["Ćwikła", "Madzia", "Miki"], "time": null}, {"id": 117, "month": 1, "day": 26, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "KG ANIMALIA", "people": ["Daria"], "time": null}, {"id": 118, "month": 1, "day": 27, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "ADMI + SZKOLENIE- 17:00 9J", "people": ["Karol"], "time": "17:00"}, {"id": 119, "month": 1, "day": 27, "weekday": "wtorek", "cat": "INNE", "title": "szkolenie z mnemotechnik", "people": ["Karol"], "time": null}, {"id": 120, "month": 1, "day": 28, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 121, "month": 1, "day": 29, "weekday": "czwartek", "cat": "ZEBRANIA/INNE", "title": "HR - 18:00 - 9J", "people": ["Marcel"], "time": "18:00"}, {"id": 122, "month": 1, "day": 29, "weekday": "czwartek", "cat": "INNE", "title": "SZKOLENIE DJ'ka", "people": ["Marcel"], "time": null}, {"id": 123, "month": 1, "day": 30, "weekday": "piątek", "cat": "PROJEKTY", "title": "ODPRAWA BALU", "people": ["Daria"], "time": null}, {"id": 124, "month": 1, "day": 31, "weekday": "sobota", "cat": "PROJEKTY", "title": "BAL", "people": ["Daria", "wszyscy"], "time": null}, {"id": 125, "month": 2, "day": 1, "weekday": "niedziela", "cat": "APLIKACJE", "title": "TEAM TEDX", "people": [], "time": null}, {"id": 126, "month": 2, "day": 2, "weekday": "poniedziałek", "cat": "INNE", "title": "TED TALKS", "people": ["Daria"], "time": null}, {"id": 127, "month": 2, "day": 3, "weekday": "wtorek", "cat": "ZEBRANIA", "title": "SKS", "people": ["Ćwikła"], "time": null}, {"id": 128, "month": 2, "day": 3, "weekday": "wtorek", "cat": "ZEBRANIA/INNE", "title": "PROMOCJA - SZKOLENIE 14:30-18:00", "people": ["Ćwikła"], "time": "14:30"}, {"id": 129, "month": 2, "day": 4, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 130, "month": 2, "day": 5, "weekday": "czwartek", "cat": "PROJEKTY", "title": "odprawa przydziałki", "people": ["Marcel"], "time": null}, {"id": 131, "month": 2, "day": 6, "weekday": "piątek", "cat": "PROJEKTY", "title": "PRZYDZIAŁKI", "people": ["Marcel"], "time": null}, {"id": 132, "month": 2, "day": 7, "weekday": "sobota", "cat": "UE", "title": "ZIMOWA SESJA EGZAMINACYJNA", "people": [], "time": null}, {"id": 133, "month": 2, "day": 9, "weekday": "poniedziałek", "cat": "ZEBRANIA", "title": "RUSS", "people": ["Ćwikła", "Daria"], "time": null}, {"id": 134, "month": 2, "day": 10, "weekday": "wtorek", "cat": "APLIKACJE", "title": "ZARZĄD ANIMALIA", "people": ["Daria"], "time": null}, {"id": 135, "month": 2, "day": 11, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 136, "month": 2, "day": 11, "weekday": "środa", "cat": "INNE", "title": "TŁUSTY CZWARTEK", "people": ["Kuba", "wszyscy"], "time": null}, {"id": 137, "month": 2, "day": 12, "weekday": "czwartek", "cat": "APLIKACJE", "title": "KG GRADUETION", "people": ["Daria"], "time": null}, {"id": 138, "month": 2, "day": 13, "weekday": "piątek", "cat": "ZEBRANIA", "title": "INTEGRACJA - STUDNIÓWKA", "people": [], "time": null}, {"id": 139, "month": 2, "day": 18, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["wszyscy"], "time": null}, {"id": 140, "month": 2, "day": 21, "weekday": "sobota", "cat": "UE", "title": "ZIMOWA SESJA POPRAWKOWA", "people": [], "time": null}, {"id": 141, "month": 2, "day": 23, "weekday": "poniedziałek", "cat": "APLIKACJE", "title": "KG ADAPCIAK", "people": ["Daria"], "time": null}, {"id": 142, "month": 2, "day": 24, "weekday": "wtorek", "cat": "APLIKACJE", "title": "TEAM ANIMALIA", "people": ["Daria"], "time": null}, {"id": 143, "month": 2, "day": 25, "weekday": "środa", "cat": "ZEBRANIA", "title": "ZEBRANIE ZARZĄDU", "people": ["Daria", "wszyscy"], "time": null}, {"id": 144, "month": 2, "day": 27, "weekday": "piątek", "cat": "SSUEW", "title": "REKRUTACJA", "people": ["Marcel"], "time": null}];

// ---------- konfiguracja ----------
const CATS = {
  "UE":            { label: "UE",          color: "#6366f1", soft: "#eef0fe" },
  "SSUEW":         { label: "SSUEW",       color: "#0d9488", soft: "#e6f6f4" },
  "PROJEKTY":      { label: "Projekty",    color: "#d97706", soft: "#fdf2e3" },
  "ZEBRANIA":      { label: "Zebrania",    color: "#2563eb", soft: "#e8f0fe" },
  "ZEBRANIA/INNE": { label: "Zeb./inne",   color: "#0ea5e9", soft: "#e5f5fd" },
  "INNE":          { label: "Inne",        color: "#7c3aed", soft: "#f1eafe" },
  "APLIKACJE":     { label: "Aplikacje",   color: "#e11d48", soft: "#fdeaef" },
};
const CAT_KEYS = Object.keys(CATS);
const MONTHS = [
  { m: 10, y: 2025, name: "Październik", short: "Paź" },
  { m: 11, y: 2025, name: "Listopad",   short: "Lis" },
  { m: 12, y: 2025, name: "Grudzień",   short: "Gru" },
  { m: 1,  y: 2026, name: "Styczeń",    short: "Sty" },
  { m: 2,  y: 2026, name: "Luty",       short: "Lut" },
];
const WD = ["Pon","Wt","Śr","Czw","Pt","Sob","Nie"];
const WD_FULL = ["poniedziałek","wtorek","środa","czwartek","piątek","sobota","niedziela"];
const PERSON_COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16"];

function personColor(n){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return PERSON_COLORS[h%PERSON_COLORS.length];}
function initials(n){return n==="wszyscy"?"★":n.slice(0,2).toUpperCase();}
function firstWeekdayIndex(y,m){return (new Date(y,m-1,1).getDay()+6)%7;}
function daysInMonth(y,m){return new Date(y,m,0).getDate();}
function weekdayOf(y,m,d){return WD_FULL[(new Date(y,m-1,d).getDay()+6)%7];}
function toMin(t){if(!t)return null;const[a,b]=t.split(":").map(Number);return a*60+b;}
function roomOf(title){const mm=title.match(/(\d{1,3})\s*([JAZ])\b/);return mm?(mm[1]+mm[2]).toUpperCase():null;}

function Avatar({name,size=20}){
  return <span title={name} style={{width:size,height:size,borderRadius:size,background:personColor(name),color:"#fff",fontSize:size*0.42,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,letterSpacing:"-0.02em"}}>{initials(name)}</span>;
}

export default function SemestrPlanner(){
  const [events,setEvents]=useState(()=>RAW_EVENTS.map(e=>({...e,room:roomOf(e.title),status:"confirmed",comments:seedComments(e.id)})));
  const [proposals,setProposals]=useState(SEED_PROPOSALS);
  const [monthIdx,setMonthIdx]=useState(0);
  const [view,setView]=useState("calendar");
  const [activeCats,setActiveCats]=useState(new Set(CAT_KEYS));
  const [person,setPerson]=useState("");
  const [selected,setSelected]=useState(null);
  const [role,setRole]=useState("przew");
  const [sync,setSync]=useState("live"); // live | async
  const [inbox,setInbox]=useState(false);
  const [adding,setAdding]=useState(false);
  const [toast,setToast]=useState(null);
  const [dragId,setDragId]=useState(null);
  const fileRef=useRef();

  const cur=MONTHS[monthIdx];
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(null),3200);return()=>clearTimeout(t);}},[toast]);

  const roster=useMemo(()=>{const s=new Set();RAW_EVENTS.forEach(e=>e.people.forEach(p=>{if(p!=="wszyscy")s.add(p);}));return[...s].sort();},[]);
  const monthEvents=useMemo(()=>events.filter(e=>e.month===cur.m),[events,cur.m]);

  function visible(e){
    if(!activeCats.has(e.cat))return false;
    if(person&&!(e.people.includes(person)||e.people.includes("wszyscy")))return false;
    return true;
  }

  // ---- kolizje: osoby (>=2 tego dnia) + sale (ta sama sala, godziny w 90 min) ----
  function computeConflicts(evs){
    const byDay={};
    evs.forEach(e=>(byDay[e.day]=byDay[e.day]||[]).push(e));
    const res={};
    Object.entries(byDay).forEach(([day,list])=>{
      const perPerson={},perRoom={};
      list.forEach(e=>{
        e.people.forEach(p=>{if(p!=="wszyscy")(perPerson[p]=perPerson[p]||[]).push(e);});
        if(e.room&&e.time)(perRoom[e.room]=perRoom[e.room]||[]).push(e);
      });
      const people=Object.entries(perPerson).filter(([,a])=>a.length>=2).map(([p,a])=>{
        const timed=a.filter(x=>x.time).map(x=>toMin(x.time));
        const hard=timed.some((t,i)=>timed.some((u,j)=>i!==j&&Math.abs(t-u)<90));
        return{person:p,count:a.length,hard};
      });
      const rooms=Object.entries(perRoom).filter(([,a])=>a.length>=2).map(([r,a])=>{
        const ts=a.map(x=>toMin(x.time));
        const hard=ts.some((t,i)=>ts.some((u,j)=>i!==j&&Math.abs(t-u)<90));
        return{room:r,count:a.length,hard,times:a.map(x=>x.time)};
      }).filter(x=>x.hard);
      if(people.length||rooms.length)res[day]={people,rooms};
    });
    return res;
  }
  const conflicts=useMemo(()=>computeConflicts(monthEvents),[monthEvents]);
  const semesterConflicts=useMemo(()=>{
    const out={};MONTHS.forEach(mo=>{out[mo.m]=computeConflicts(events.filter(e=>e.month===mo.m));});return out;
  },[events]);

  function toggleCat(k){setActiveCats(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});}

  function moveEvent(id,toDay){
    setEvents(prev=>prev.map(e=>e.id===id?{...e,day:toDay,weekday:weekdayOf(cur.y,cur.m,toDay)}:e));
  }
  function handleDrop(toDay){
    const id=dragId;setDragId(null);
    if(id==null)return;
    const ev=monthEvents.find(e=>e.id===id);
    if(!ev||ev.day===toDay)return;
    if(sync==="live"){
      moveEvent(id,toDay);
      setToast({type:"live",msg:`Przeniesiono „${shortTitle(ev.title)}" na ${toDay}. — widzą to wszyscy online`});
    }else{
      setProposals(prev=>[{id:"m"+Date.now(),kind:"move",author:role==="przew"?"Ty":"Ty (członek)",month:cur.m,eventId:id,fromDay:ev.day,toDay,title:ev.title,cat:ev.cat,people:ev.people,time:ev.time},...prev]);
      setToast({type:"async",msg:`Zgłoszono propozycję: „${shortTitle(ev.title)}" → ${toDay}. Czeka na akceptację.`});
    }
  }

  function acceptProposal(p){
    if(p.kind==="add"){
      setEvents(prev=>[...prev,{id:Math.max(...prev.map(x=>x.id))+1,month:p.month,day:p.day,weekday:weekdayOf(cur.y,p.month,p.day),cat:p.cat,title:p.title,people:p.people,time:p.time||null,room:roomOf(p.title),status:"confirmed",comments:[]}]);
    }else if(p.kind==="move"){
      setEvents(prev=>prev.map(e=>e.id===p.eventId?{...e,day:p.toDay,weekday:weekdayOf(cur.y,p.month,p.toDay)}:e));
    }
    setProposals(prev=>prev.filter(x=>x.id!==p.id));
    setToast({type:"live",msg:"Zatwierdzono i dodano do harmonogramu."});
  }
  function rejectProposal(p){setProposals(prev=>prev.filter(x=>x.id!==p.id));}

  function checkClash(day,people,room,time,month=cur.m){
    const evs=events.filter(e=>e.month===month&&e.day===day);
    const hits=[];
    people.forEach(p=>{if(p==="wszyscy")return;const n=evs.filter(e=>e.people.includes(p)).length;if(n>=1)hits.push({type:"osoba",label:`${p} ma już ${n} inne wydarzenie tego dnia`});});
    if(room&&time){const t=toMin(time);evs.filter(e=>e.room===room&&e.time&&Math.abs(toMin(e.time)-t)<90).forEach(e=>hits.push({type:"sala",label:`sala ${room} zajęta o ${e.time} (${shortTitle(e.title)})`}));}
    return hits;
  }

  function submitAdd(f){
    if(role==="czlonek"||sync==="async"){
      setProposals(prev=>[{id:"p"+Date.now(),kind:"add",author:role==="przew"?"Ty":"Ty (członek)",month:cur.m,...f},...prev]);
      setToast({type:"async",msg:"Zgłoszono jako propozycję — czeka w skrzynce."});
    }else{
      setEvents(prev=>[...prev,{id:Math.max(...prev.map(x=>x.id))+1,month:cur.m,weekday:weekdayOf(cur.y,cur.m,f.day),room:roomOf(f.title),status:"confirmed",comments:[],...f}]);
      setToast({type:"live",msg:"Dodano do harmonogramu."});
    }
    setAdding(false);
  }

  function exportXlsx(){
    const wb=XLSX.utils.book_new();
    MONTHS.forEach(mo=>{
      const head1=["dzień","dzień tygodnia","Co się dzieje ?","","","","","","","Kogo dotyczy?"];
      const head2=["","","UE","SSUEW","PROJEKTY","ZEBRANIA","ZEBRANIA / INNE","INNE","APLIKACJE",""];
      const rows=[head1,head2];
      const total=daysInMonth(mo.y,mo.m);
      const mev=events.filter(e=>e.month===mo.m);
      for(let d=1;d<=total;d++){
        const de=mev.filter(e=>e.day===d);
        const colFor=c=>de.filter(e=>e.cat===c).map(e=>e.title).join(" / ");
        const ppl=[...new Set(de.flatMap(e=>e.people))].join(", ");
        rows.push([d,weekdayOf(mo.y,mo.m,d),colFor("UE"),colFor("SSUEW"),colFor("PROJEKTY"),colFor("ZEBRANIA"),colFor("ZEBRANIA/INNE"),colFor("INNE"),colFor("APLIKACJE"),ppl]);
      }
      const ws=XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,mo.name.toUpperCase().slice(0,31));
    });
    XLSX.writeFile(wb,"SEMESTR_ZIMOWY_export.xlsx");
    setToast({type:"live",msg:"Wyeksportowano do Excela (5 arkuszy)."});
  }
  function importXlsx(e){
    const f=e.target.files?.[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:"array"});
        let count=0;const added=[];let nid=Math.max(...events.map(x=>x.id),0);
        wb.SheetNames.forEach(sn=>{
          const mo=MONTHS.find(m=>m.name.toUpperCase().slice(0,31)===sn);if(!mo)return;
          const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});
          const catCols={2:"UE",3:"SSUEW",4:"PROJEKTY",5:"ZEBRANIA",6:"ZEBRANIA/INNE",7:"INNE",8:"APLIKACJE"};
          for(let i=2;i<aoa.length;i++){
            const row=aoa[i];if(!row||!row[0])continue;const day=parseInt(row[0]);if(!day)continue;
            const ppl=String(row[9]||"").split(",").map(s=>s.trim()).filter(Boolean);
            Object.entries(catCols).forEach(([c,cat])=>{
              const v=row[c];if(v&&String(v).trim())String(v).split(" / ").forEach(t=>{
                nid++;count++;added.push({id:nid,month:mo.m,day,weekday:weekdayOf(mo.y,mo.m,day),cat,title:t.trim(),people:ppl,time:(t.match(/(\d{1,2})[:.](\d{2})/)?t.match(/(\d{1,2})[:.](\d{2})/)[0].replace(".",":"):null),room:roomOf(t),status:"confirmed",comments:[]});
              });
            });
          }
        });
        if(count){setEvents(added);setToast({type:"live",msg:`Zaimportowano ${count} wydarzeń z Excela.`});}
        else setToast({type:"async",msg:"Nie znaleziono danych w formacie eksportu apki."});
      }catch(err){setToast({type:"async",msg:"Nie udało się odczytać pliku."});}
    };
    r.readAsArrayBuffer(f);e.target.value="";
  }

  const pendingForMonth=proposals.filter(p=>p.month===cur.m);
  const ONLINE=["Mikołaj","Kuba","Daria","Ćwikła"];

  return (
    <div style={{fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#1a1a2e",background:"#fafafa",minHeight:"680px",position:"relative"}}>
      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #ececf0",padding:"12px 20px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <div style={{fontWeight:800,fontSize:16,letterSpacing:"-0.02em"}}>Semestr&nbsp;Zimowy <span style={{color:"#8a8a99",fontWeight:600}}>· Zarząd SSUEW</span></div>
        <div style={{display:"flex",background:"#f2f2f5",borderRadius:10,padding:3,gap:2}}>
          {[["semester",LayoutGrid,"Semestr"],["calendar",Calendar,"Miesiąc"],["list",List,"Lista"],["people",Users,"Osoby"]].map(([k,Icon,lab])=>(
            <button key={k} onClick={()=>setView(k)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 11px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:600,background:view===k?"#fff":"transparent",color:view===k?"#1a1a2e":"#7a7a88",boxShadow:view===k?"0 1px 3px rgba(0,0,0,0.08)":"none"}}><Icon size={14}/>{lab}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        {/* SYNC MODE */}
        <div style={{display:"flex",background:"#f2f2f5",borderRadius:10,padding:3,gap:2}}>
          <button onClick={()=>setSync("live")} style={modeBtn(sync==="live","#0d9488")}><Radio size={13}/>Na żywo</button>
          <button onClick={()=>setSync("async")} style={modeBtn(sync==="async","#d97706")}><Inbox size={13}/>Async</button>
        </div>
        <button onClick={()=>setRole(r=>r==="przew"?"czlonek":"przew")} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 11px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700,border:"1px solid "+(role==="przew"?"#c7d2fe":"#e2e2e8"),background:role==="przew"?"#eef2ff":"#fff",color:role==="przew"?"#4338ca":"#555"}}>
          {role==="przew"?<Shield size={14}/>:<User size={14}/>}{role==="przew"?"Przew.":"Członek"}
        </button>
        {role==="przew"&&(
          <button onClick={()=>setInbox(true)} style={{position:"relative",padding:8,borderRadius:9,border:"1px solid #e2e2e8",background:"#fff",cursor:"pointer"}}>
            <Bell size={16} color="#555"/>
            {pendingForMonth.length>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#e11d48",color:"#fff",fontSize:10,fontWeight:800,borderRadius:10,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{pendingForMonth.length}</span>}
          </button>
        )}
        <button onClick={()=>setAdding(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:9,border:"none",background:"#1a1a2e",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12.5}}><Plus size={14}/>Dodaj</button>
      </div>

      {/* MODE EXPLAINER + PRESENCE */}
      <div style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:10,background:sync==="live"?"#f0faf8":"#fdf7ec",borderBottom:"1px solid #f0f0f3",fontSize:12,color:sync==="live"?"#0d7a6f":"#a05a00",fontWeight:600}}>
        {sync==="live"?<Radio size={14}/>:<Inbox size={14}/>}
        {sync==="live"
          ? <span>Tryb na żywo: przeciągnięcie wydarzenia <b>od razu je przenosi</b> i widzą to wszyscy. Dobre na samą Sesję Operacyjną, gdy siedzicie razem.</span>
          : <span>Tryb async: przeciągnięcie tworzy <b>propozycję</b>, która czeka na Twoją akceptację. Dobre na zgłoszenia w ciągu tygodnia „coś nam wypadło".</span>}
        <div style={{flex:1}}/>
        {sync==="live"&&<div style={{display:"flex",alignItems:"center",gap:6}}><Wifi size={13} color="#0d9488"/><span style={{color:"#0d7a6f",fontWeight:600,fontSize:11.5}}>Online:</span>{ONLINE.map((p,i)=><span key={p} style={{marginLeft:i?-6:0,outline:"2px solid #f0faf8",borderRadius:20}}><Avatar name={p} size={20}/></span>)}</div>}
      </div>

      {/* CONTROLS */}
      {view!=="semester"&&(
      <div style={{padding:"11px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid #f0f0f3"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setMonthIdx(i=>Math.max(0,i-1))} disabled={monthIdx===0} style={navBtn(monthIdx===0)}><ChevronLeft size={17}/></button>
          <div style={{fontWeight:800,fontSize:15,minWidth:132,textAlign:"center"}}>{cur.name} {cur.y}</div>
          <button onClick={()=>setMonthIdx(i=>Math.min(MONTHS.length-1,i+1))} disabled={monthIdx===MONTHS.length-1} style={navBtn(monthIdx===MONTHS.length-1)}><ChevronRight size={17}/></button>
        </div>
        <div style={{width:1,height:22,background:"#e8e8ec"}}/>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {CAT_KEYS.map(k=>{const on=activeCats.has(k),c=CATS[k];return(
            <button key={k} onClick={()=>toggleCat(k)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:20,cursor:"pointer",fontSize:11.5,fontWeight:600,border:"1px solid "+(on?c.color:"#e4e4e8"),background:on?c.soft:"#fff",color:on?c.color:"#aaa"}}>
              <span style={{width:7,height:7,borderRadius:7,background:on?c.color:"#ccc"}}/>{c.label}
            </button>);})}
        </div>
        <div style={{flex:1}}/>
        <select value={person} onChange={e=>setPerson(e.target.value)} style={{padding:"7px 11px",borderRadius:9,border:"1px solid #e2e2e8",fontSize:12.5,fontWeight:600,background:"#fff",cursor:"pointer",color:person?"#1a1a2e":"#888"}}>
          <option value="">Wszystkie osoby</option>{roster.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{display:"flex",gap:6}}>
          <button onClick={exportXlsx} title="Eksport do Excela" style={iconBtn}><Download size={15}/></button>
          <button onClick={()=>fileRef.current?.click()} title="Import z Excela (plik z eksportu apki)" style={iconBtn}><Upload size={15}/></button>
          <input ref={fileRef} type="file" accept=".xlsx" onChange={importXlsx} style={{display:"none"}}/>
        </div>
      </div>)}

      {/* BODY */}
      <div style={{padding:20}}>
        {view==="semester"&&<SemesterView events={events} activeCats={activeCats} person={person} conflicts={semesterConflicts} onOpenMonth={(mi)=>{setMonthIdx(mi);setView("calendar");}}/>}
        {view==="calendar"&&<CalendarView cur={cur} events={monthEvents} visible={visible} conflicts={conflicts} person={person} proposals={pendingForMonth} onSelect={setSelected} dragId={dragId} setDragId={setDragId} onDrop={handleDrop} sync={sync}/>}
        {view==="list"&&<ListView events={monthEvents.filter(visible)} onSelect={setSelected}/>}
        {view==="people"&&<PeopleView events={monthEvents} roster={roster} activeCats={activeCats}/>}
      </div>

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",background:"#1a1a2e",color:"#fff",padding:"11px 18px",borderRadius:11,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:9,boxShadow:"0 8px 28px rgba(0,0,0,0.28)",zIndex:80,maxWidth:"90vw"}}>
          <span style={{width:8,height:8,borderRadius:8,background:toast.type==="live"?"#34d399":"#fbbf24",flexShrink:0}}/>{toast.msg}
        </div>
      )}

      {selected&&<EventDrawer ev={selected} onClose={()=>setSelected(null)} onComment={txt=>{
        setEvents(prev=>prev.map(e=>e.id===selected.id?{...e,comments:[...e.comments,{who:role==="przew"?"Mikołaj":"Ty",txt,ts:"teraz"}]}:e));
        setSelected(s=>({...s,comments:[...s.comments,{who:role==="przew"?"Mikołaj":"Ty",txt,ts:"teraz"}]}));
      }}/>}
      {inbox&&<InboxDrawer proposals={pendingForMonth} onClose={()=>setInbox(false)} onAccept={acceptProposal} onReject={rejectProposal} checkClash={checkClash}/>}
      {adding&&<AddDrawer cur={cur} role={role} sync={sync} roster={roster} onClose={()=>setAdding(false)} onSubmit={submitAdd}/>}
    </div>
  );
}

function modeBtn(on,c){return{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,background:on?"#fff":"transparent",color:on?c:"#7a7a88",boxShadow:on?"0 1px 3px rgba(0,0,0,0.08)":"none"};}
function navBtn(d){return{padding:6,borderRadius:8,border:"1px solid #e6e6ea",background:"#fff",cursor:d?"default":"pointer",opacity:d?0.4:1,display:"flex"};}
const iconBtn={padding:8,borderRadius:9,border:"1px solid #e2e2e8",background:"#fff",cursor:"pointer",display:"flex",color:"#555"};
function shortTitle(t){return t.length>32?t.slice(0,31)+"…":t;}

// ============ SEMESTR (5 miesięcy naraz) ============
function SemesterView({events,activeCats,person,conflicts,onOpenMonth}){
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
      {MONTHS.map((mo,mi)=>{
        const offset=firstWeekdayIndex(mo.y,mo.m),total=daysInMonth(mo.y,mo.m);
        const mev=events.filter(e=>e.month===mo.m&&activeCats.has(e.cat)&&(!person||e.people.includes(person)||e.people.includes("wszyscy")));
        const conf=conflicts[mo.m]||{};
        const cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=total;d++)cells.push(d);
        return (
          <div key={mo.m} onClick={()=>onOpenMonth(mi)} style={{background:"#fff",border:"1px solid #ececf0",borderRadius:14,padding:14,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:800,fontSize:14}}>{mo.name}</span>
              <span style={{fontSize:11,color:"#9a9aa6",fontWeight:600}}>{mev.length} wydarzeń</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
              {WD.map((w,i)=><div key={w} style={{fontSize:9,fontWeight:700,color:i>=5?"#c99":"#bbb",textAlign:"center"}}>{w[0]}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {cells.map((d,i)=>{
                if(!d)return <div key={i}/>;
                const de=mev.filter(e=>e.day===d);
                const c=conf[d];const hard=c&&(c.people.some(x=>x.hard)||c.rooms.length);
                return (
                  <div key={i} style={{aspectRatio:"1",borderRadius:6,background:de.length?"#fafafc":"transparent",border:"1px solid "+(de.length?"#eee":"transparent"),padding:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
                    <span style={{fontSize:9.5,color:"#999",fontWeight:600,lineHeight:1}}>{d}</span>
                    <div style={{display:"flex",gap:1.5,marginTop:2,flexWrap:"wrap",justifyContent:"center",maxWidth:"100%"}}>
                      {de.slice(0,3).map(e=><span key={e.id} style={{width:4,height:4,borderRadius:4,background:CATS[e.cat].color}}/>)}
                    </div>
                    {(c)&&<span style={{position:"absolute",top:1,right:2,width:5,height:5,borderRadius:5,background:hard?"#e11d48":"#d97706"}}/>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ MIESIĄC (z drag&drop) ============
function CalendarView({cur,events,visible,conflicts,person,proposals,onSelect,dragId,setDragId,onDrop,sync}){
  const offset=firstWeekdayIndex(cur.y,cur.m),total=daysInMonth(cur.y,cur.m);
  const cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=total;d++)cells.push(d);while(cells.length%7)cells.push(null);
  const [over,setOver]=useState(null);
  const moveGhosts=proposals.filter(p=>p.kind==="move");
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,marginBottom:8}}>
        {WD.map((w,i)=><div key={w} style={{fontSize:11,fontWeight:700,color:i>=5?"#c0392b":"#9a9aa6",textTransform:"uppercase",letterSpacing:"0.04em",paddingLeft:4}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={i} style={{minHeight:100}}/>;
          const vis=events.filter(e=>e.day===d).filter(visible);
          const c=conflicts[d];
          const relConf=person?(c?{people:c.people.filter(x=>x.person===person),rooms:c.rooms}:null):c;
          const showConf=relConf&&(relConf.people.length||relConf.rooms.length);
          const weekend=(offset+d-1)%7>=5;
          const ghosts=moveGhosts.filter(g=>g.toDay===d);
          const isOver=over===d;
          return (
            <div key={i}
              onDragOver={e=>{e.preventDefault();setOver(d);}}
              onDragLeave={()=>setOver(o=>o===d?null:o)}
              onDrop={()=>{setOver(null);onDrop(d);}}
              style={{minHeight:100,background:isOver?"#eef6ff":weekend?"#fbfbfc":"#fff",border:"1px solid "+(isOver?"#93c5fd":"#ececf0"),borderRadius:12,padding:8,display:"flex",flexDirection:"column",gap:4,position:"relative",transition:"background .12s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:700,color:weekend?"#b0b0bb":"#444"}}>{d}</span>
                {showConf&&<span title="Kolizja" style={{color:(relConf.people.some(x=>x.hard)||relConf.rooms.length)?"#e11d48":"#d97706",display:"flex"}}><AlertTriangle size={13}/></span>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3,overflow:"hidden"}}>
                {vis.slice(0,4).map(e=>{const cc=CATS[e.cat];return(
                  <button key={e.id} draggable
                    onDragStart={()=>setDragId(e.id)} onDragEnd={()=>setDragId(null)}
                    onClick={()=>onSelect(e)}
                    style={{textAlign:"left",border:"none",cursor:"grab",background:cc.soft,color:cc.color,borderLeft:"3px solid "+cc.color,borderRadius:5,padding:"3px 6px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.3,opacity:dragId===e.id?0.4:1}}>
                    {e.time&&<span style={{opacity:0.75,fontWeight:700}}>{e.time} </span>}{shortTitle(e.title)}
                  </button>);})}
                {vis.length>4&&<span style={{fontSize:10.5,color:"#9a9aa6",fontWeight:600,paddingLeft:4}}>+{vis.length-4} więcej</span>}
                {ghosts.map(g=>{const cc=CATS[g.cat];return(
                  <div key={g.id} style={{border:"1.5px dashed "+cc.color,borderRadius:5,padding:"3px 6px",fontSize:10.5,fontWeight:600,color:cc.color,background:"#fff",opacity:0.85,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>↷ {shortTitle(g.title)} <span style={{fontSize:9}}>(propozycja)</span></div>);})}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,fontSize:11.5,color:"#9a9aa6",display:"flex",alignItems:"center",gap:6}}>
        <span>💡 Złap wydarzenie i przeciągnij na inny dzień.</span>
        <span style={{color:sync==="live"?"#0d9488":"#d97706",fontWeight:600}}>{sync==="live"?"Teraz: przeniesie od razu.":"Teraz: utworzy propozycję do akceptacji."}</span>
      </div>
    </div>
  );
}

// ============ LISTA ============
function ListView({events,onSelect}){
  const byDay={};[...events].sort((a,b)=>a.day-b.day).forEach(e=>(byDay[e.day]=byDay[e.day]||[]).push(e));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:760}}>
      {Object.entries(byDay).map(([day,evs])=>(
        <div key={day} style={{display:"flex",gap:14}}>
          <div style={{minWidth:52,textAlign:"right",paddingTop:10}}>
            <div style={{fontSize:22,fontWeight:800,lineHeight:1}}>{day}</div>
            <div style={{fontSize:11,color:"#9a9aa6",fontWeight:600}}>{evs[0].weekday}</div>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            {evs.map(e=>{const c=CATS[e.cat];return(
              <button key={e.id} onClick={()=>onSelect(e)} style={{textAlign:"left",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:11,border:"1px solid #ececf0",background:"#fff",cursor:"pointer"}}>
                <span style={{width:4,height:34,borderRadius:4,background:c.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.title}</div>
                  <div style={{fontSize:11,color:c.color,fontWeight:700,marginTop:2}}>{c.label}{e.time?" · "+e.time:""}{e.room?" · sala "+e.room:""}</div>
                </div>
                <div style={{display:"flex"}}>
                  {e.people.slice(0,5).map((p,i)=><span key={i} style={{marginLeft:i?-6:0}}><Avatar name={p}/></span>)}
                  {e.people.length>5&&<span style={{marginLeft:-6,width:20,height:20,borderRadius:20,background:"#e8e8ec",color:"#666",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>+{e.people.length-5}</span>}
                </div>
              </button>);})}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ OSOBY ============
function PeopleView({events,roster,activeCats}){
  const load=roster.map(p=>{
    const evs=events.filter(e=>activeCats.has(e.cat)&&e.people.includes(p));
    const byDay={};evs.forEach(e=>(byDay[e.day]=byDay[e.day]||[]).push(e));
    const clashDays=Object.values(byDay).filter(a=>a.length>=2).length;
    return{p,count:evs.length,clashDays};
  }).sort((a,b)=>b.count-a.count);
  const max=Math.max(...load.map(l=>l.count),1);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:720}}>
      {load.map(l=>(
        <div key={l.p} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 14px",borderRadius:12,border:"1px solid #ececf0",background:"#fff"}}>
          <Avatar name={l.p} size={30}/>
          <div style={{minWidth:78,fontWeight:700,fontSize:13.5}}>{l.p}</div>
          <div style={{flex:1,height:10,background:"#f0f0f3",borderRadius:6,overflow:"hidden"}}><div style={{width:(l.count/max*100)+"%",height:"100%",background:personColor(l.p),borderRadius:6}}/></div>
          <div style={{fontSize:12.5,fontWeight:700,minWidth:74,textAlign:"right"}}>{l.count} przypisań</div>
          {l.clashDays>0&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11.5,fontWeight:700,color:"#d97706",background:"#fdf2e3",padding:"3px 8px",borderRadius:8}}><AlertTriangle size={12}/>{l.clashDays} dni</span>}
        </div>
      ))}
    </div>
  );
}

// ============ DRAWERY ============
function EventDrawer({ev,onClose,onComment}){
  const [txt,setTxt]=useState("");const c=CATS[ev.cat];
  return (
    <Overlay onClose={onClose}>
      <div style={{padding:"20px 22px",borderBottom:"1px solid #f0f0f3"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <span style={{fontSize:11.5,fontWeight:800,color:c.color,background:c.soft,padding:"3px 9px",borderRadius:7}}>{c.label}</span>
          <button onClick={onClose} style={xBtn}><X size={18}/></button>
        </div>
        <div style={{fontSize:19,fontWeight:800,marginTop:12,letterSpacing:"-0.02em",lineHeight:1.25}}>{ev.title}</div>
        <div style={{display:"flex",gap:14,marginTop:10,fontSize:13,color:"#666",fontWeight:600,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><Calendar size={14}/>{ev.day}. ({ev.weekday})</span>
          {ev.time&&<span style={{display:"flex",alignItems:"center",gap:5}}><Clock size={14}/>{ev.time}</span>}
          {ev.room&&<span style={{display:"flex",alignItems:"center",gap:5}}><MapPin size={14}/>sala {ev.room}</span>}
        </div>
      </div>
      <div style={{padding:"18px 22px",borderBottom:"1px solid #f0f0f3"}}>
        <div style={{fontSize:11.5,fontWeight:700,color:"#9a9aa6",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:10}}>Osoby odpowiedzialne</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {ev.people.map((p,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:6,background:"#f5f5f8",borderRadius:20,padding:"4px 11px 4px 4px",fontSize:12.5,fontWeight:600}}><Avatar name={p} size={22}/>{p}</span>)}
        </div>
      </div>
      <div style={{padding:"18px 22px",flex:1,overflowY:"auto"}}>
        <div style={{fontSize:11.5,fontWeight:700,color:"#9a9aa6",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><MessageSquare size={13}/>Komentarze</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {ev.comments.length===0&&<div style={{fontSize:13,color:"#aaa"}}>Brak komentarzy. Napisz pierwszy — np. że coś wypada.</div>}
          {ev.comments.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:10}}>
              <Avatar name={c.who} size={26}/>
              <div><div style={{fontSize:12.5}}><b>{c.who}</b> <span style={{color:"#aaa",fontWeight:500}}>· {c.ts}</span></div>
              <div style={{fontSize:13,color:"#333",marginTop:2,lineHeight:1.45}}>{c.txt}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 22px",borderTop:"1px solid #f0f0f3",display:"flex",gap:8}}>
        <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Dodaj komentarz na bieżąco…" onKeyDown={e=>{if(e.key==="Enter"&&txt.trim()){onComment(txt.trim());setTxt("");}}} style={{flex:1,padding:"10px 13px",borderRadius:10,border:"1px solid #e2e2e8",fontSize:13,outline:"none"}}/>
        <button onClick={()=>{if(txt.trim()){onComment(txt.trim());setTxt("");}}} style={{padding:"0 14px",borderRadius:10,border:"none",background:"#1a1a2e",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center"}}><Send size={16}/></button>
      </div>
    </Overlay>
  );
}

function InboxDrawer({proposals,onClose,onAccept,onReject,checkClash}){
  return (
    <Overlay onClose={onClose}>
      <div style={{padding:"20px 22px",borderBottom:"1px solid #f0f0f3",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:17,fontWeight:800}}>Propozycje do zatwierdzenia</div>
        <button onClick={onClose} style={xBtn}><X size={18}/></button>
      </div>
      <div style={{padding:"18px 22px",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {proposals.length===0&&<div style={{fontSize:13.5,color:"#aaa",textAlign:"center",paddingTop:30}}>Brak nowych propozycji w tym miesiącu.</div>}
        {proposals.map(p=>{
          const c=CATS[p.cat];
          const clash=checkClash(p.kind==="move"?p.toDay:p.day,p.people||[],roomOf(p.title),p.time,p.month);
          return (
            <div key={p.id} style={{border:"1px solid #ececf0",borderRadius:13,padding:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:800,color:c.color,background:c.soft,padding:"2px 8px",borderRadius:6}}>{c.label}</span>
                <span style={{fontSize:10.5,fontWeight:800,color:p.kind==="move"?"#d97706":"#0d9488",background:p.kind==="move"?"#fdf2e3":"#e6f6f4",padding:"2px 7px",borderRadius:6}}>{p.kind==="move"?"PRZENIESIENIE":"NOWE"}</span>
                <span style={{fontSize:11.5,color:"#999",fontWeight:600}}>{p.author}</span>
              </div>
              <div style={{fontSize:14.5,fontWeight:700}}>{p.title}</div>
              <div style={{fontSize:12.5,color:"#666",marginTop:3,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                {p.kind==="move"?<><span>{p.fromDay}.</span><ArrowRight size={13}/><span>{p.toDay}.</span></>:<span>{p.day}. dnia</span>}
                {p.time&&<span>· {p.time}</span>}
              </div>
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {(p.people||[]).map((x,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:5,background:"#f5f5f8",borderRadius:16,padding:"3px 9px 3px 3px",fontSize:12,fontWeight:600}}><Avatar name={x} size={19}/>{x}</span>)}
              </div>
              {clash.length>0&&(
                <div style={{marginTop:10,background:"#fdf2e3",border:"1px solid #f5d9a8",borderRadius:9,padding:"8px 11px",fontSize:12,color:"#a05a00",display:"flex",gap:7}}>
                  <AlertTriangle size={15} style={{flexShrink:0,marginTop:1}}/>
                  <span>Kolizja: {clash.map(h=>h.label).join("; ")}.</span>
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={()=>onAccept(p)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:9,border:"none",background:"#0d9488",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}><Check size={15}/>Akceptuj</button>
                <button onClick={()=>onReject(p)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:9,border:"1px solid #e2e2e8",background:"#fff",color:"#666",cursor:"pointer",fontWeight:700,fontSize:13}}><X size={15}/>Odrzuć</button>
              </div>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}

function AddDrawer({cur,role,sync,roster,onClose,onSubmit}){
  const [title,setTitle]=useState("");const [day,setDay]=useState(1);const [cat,setCat]=useState("ZEBRANIA");const [time,setTime]=useState("");const [people,setPeople]=useState([]);
  const total=daysInMonth(cur.y,cur.m);const valid=title.trim()&&day;
  const asProposal=role==="czlonek"||sync==="async";
  return (
    <Overlay onClose={onClose}>
      <div style={{padding:"20px 22px",borderBottom:"1px solid #f0f0f3",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:17,fontWeight:800}}>Nowe wydarzenie</div><button onClick={onClose} style={xBtn}><X size={18}/></button>
      </div>
      <div style={{padding:"18px 22px",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>
        <Field label="Nazwa"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="np. Zebranie Zarządu - 18:00 9J" style={inp}/></Field>
        <div style={{display:"flex",gap:12}}>
          <Field label="Dzień"><select value={day} onChange={e=>setDay(+e.target.value)} style={inp}>{Array.from({length:total},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}</select></Field>
          <Field label="Godzina (opcjon.)"><input value={time} onChange={e=>setTime(e.target.value)} placeholder="18:00" style={inp}/></Field>
        </div>
        <Field label="Kategoria"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{CAT_KEYS.map(k=>{const c=CATS[k],on=cat===k;return <button key={k} onClick={()=>setCat(k)} style={{padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,border:"1px solid "+(on?c.color:"#e4e4e8"),background:on?c.soft:"#fff",color:on?c.color:"#999"}}>{c.label}</button>;})}</div></Field>
        <Field label="Osoby odpowiedzialne"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{roster.map(p=>{const on=people.includes(p);return <button key={p} onClick={()=>setPeople(prev=>on?prev.filter(x=>x!==p):[...prev,p])} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px 4px 4px",borderRadius:16,cursor:"pointer",fontSize:12,fontWeight:600,border:"1px solid "+(on?"#1a1a2e":"#e4e4e8"),background:on?"#1a1a2e":"#fff",color:on?"#fff":"#666"}}><Avatar name={p} size={18}/>{p}</button>;})}</div></Field>
      </div>
      <div style={{padding:"14px 22px",borderTop:"1px solid #f0f0f3"}}>
        {asProposal&&<div style={{fontSize:12,color:"#a05a00",background:"#fdf2e3",borderRadius:8,padding:"8px 11px",marginBottom:10,display:"flex",gap:7}}><AlertTriangle size={15}/><span>{role==="czlonek"?"Jako Członek zgłaszasz to jako propozycję.":"W trybie async trafia to jako propozycja."} Przewodniczący zatwierdzi po sprawdzeniu kolizji.</span></div>}
        <button disabled={!valid} onClick={()=>onSubmit({day,cat,title:title.trim(),time:time.trim()||null,people})} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:valid?"#1a1a2e":"#ccc",color:"#fff",cursor:valid?"pointer":"default",fontWeight:700,fontSize:14}}>{asProposal?"Zgłoś propozycję":"Dodaj do harmonogramu"}</button>
      </div>
    </Overlay>
  );
}
function Field({label,children}){return <div><div style={{fontSize:11.5,fontWeight:700,color:"#9a9aa6",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:7}}>{label}</div>{children}</div>;}
const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid #e2e2e8",fontSize:13.5,outline:"none",boxSizing:"border-box",fontWeight:500};
function Overlay({children,onClose}){
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,20,30,0.28)",display:"flex",justifyContent:"flex-end",zIndex:60}}><div onClick={e=>e.stopPropagation()} style={{width:420,maxWidth:"92vw",background:"#fff",height:"100%",display:"flex",flexDirection:"column",boxShadow:"-8px 0 30px rgba(0,0,0,0.12)"}}>{children}</div></div>;
}
const xBtn={border:"none",background:"#f2f2f5",borderRadius:8,padding:6,cursor:"pointer",display:"flex"};

function seedComments(id){
  if(id===7)return[{who:"Daria",txt:"Kolidowało nam z HR — przesuwamy na 18:00?",ts:"2 dni temu"},{who:"Mikołaj",txt:"Ok, sala 9J wolna. Zatwierdzam.",ts:"1 dzień temu"}];
  if(id===23)return[{who:"Karola",txt:"Ja tego dnia mam RUSS, nie wyrobię się z JWK.",ts:"wczoraj"}];
  return[];
}
const SEED_PROPOSALS=[
  {id:"p1",kind:"add",author:"Daria",month:10,day:16,cat:"INNE",title:"Spotkanie ws. Balu — DJ",time:"19:00",people:["Daria","Marcel"]},
  {id:"p2",kind:"add",author:"Kuba",month:10,day:15,cat:"ZEBRANIA/INNE",title:"Dodatkowe zebranie rekrutacji - 18:00 9J",time:"18:00",people:["Kuba","Ćwikła","Madzia"]},
  {id:"p3",kind:"add",author:"Ćwikła",month:11,day:5,cat:"PROJEKTY",title:"Odprawa TWE",time:"17:00",people:["Ćwikła","Karola"]},
];
