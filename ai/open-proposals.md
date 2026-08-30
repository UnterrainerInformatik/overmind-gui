# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).
Once a change directory exists under `openspec/changes/`, remove its entry
here.

## Event-Ansicht
Auf der personen-Seite soll es eine weitere Ansicht geben, die dazu dient, vergangene Events anzuzeigen und durchzusehen. Halte Dich dabei an die UI von frigate bitte.
## MinIO als dauerhafter Speicher
Bitte gibt zum frigate docker-compose noch ein MinIO dazu und verwende es dazu Videos zu speichern. Das soll passieren, wenn jemand auf der UI beim Betrachten der Kamera einen aufnahme-Knopf drückt (muss erst erstellt werden... mit stop), oder zusätzlich zum Übertragen, wenn jemand einen Screenshot macht, oder für alle Events, die als Alarm eingestuft wurden, oder wenn jemand einen Event nimmt und diesen dauerhaft sichern will (den Knopf gibt es auch noch nicht).
Es soll dann noch eine weitere Ansicht in personen geben, in der ich gesicherte Videos und Events ansehen kann, als wären sie noch im frigate... sie sind aber in MinIO.
