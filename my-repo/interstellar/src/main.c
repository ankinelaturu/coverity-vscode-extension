#include "log.h"
#include "nav_reader.h"
#include "thruster.h"

#include <stdio.h>

int main(void)
{
    NavReader *reader = nav_get_reader();
    nav_bind_reader(reader);
    thruster_apply_boost();
    log_status("nav");
    printf("interstellar demo: boost applied\n");
    return 0;
}
