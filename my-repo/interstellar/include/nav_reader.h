#ifndef INTERSTELLAR_NAV_READER_H
#define INTERSTELLAR_NAV_READER_H

typedef struct NavReader {
    int fuel_level;
    int status;
} NavReader;

NavReader *nav_get_reader(void);
void nav_bind_reader(NavReader *reader);
NavReader *nav_active_reader(void);

#endif
