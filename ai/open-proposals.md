# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).
Once a change directory exists under `openspec/changes/`, remove its entry
here.

## RustFS als dauerhafter Speicher
Bitte gibt zum frigate docker-compose noch ein RustFS dazu (S3-kompatibel, MinIO-Ersatz) und verwende es dazu Videos zu speichern. Das soll passieren, wenn jemand auf der UI beim Betrachten der Kamera einen aufnahme-Knopf drückt (muss erst erstellt werden... mit stop), oder zusätzlich zum Übertragen, wenn jemand einen Screenshot macht, oder für alle Events, die als Alarm eingestuft wurden, oder wenn jemand einen Event nimmt und diesen dauerhaft sichern will (den Knopf gibt es auch noch nicht).
Es soll dann noch eine weitere Ansicht in personen geben, in der ich gesicherte Videos und Events ansehen kann, als wären sie noch im frigate... sie sind aber in RustFS.
## Timeline rechts neben den Thumbnails
Ich will rechts neben den Thumbnails eine vertikale Timeline haben, die über den gesamten Bildschirm reicht und alle Events als Linien oder Rechtecke markiert hat. Ein Klick auf einen Eintrag auf dieser Timeline markiert die Kachel für dieses Event links und scrollt an die richtige Stelle. Starten tut man die Wiedergabe weiterhin nur per Klick auf die Kachel. Und vor-selektiere bitte eine Zeit bei der Suche, wenn ich auf die Events-Seite komme. Wenn da 2MIO drinnen sind wird das zäh. Ich würde vorschlagen die letzten 2 Stunden. Oder Du machst noch eine alternative 
