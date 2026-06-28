document.querySelectorAll(".nav-menu").forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (!menu.open) {
      return;
    }

    document.querySelectorAll(".nav-menu[open]").forEach((openMenu) => {
      if (openMenu !== menu) {
        openMenu.open = false;
      }
    });
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".nav-menu")) {
    return;
  }

  document.querySelectorAll(".nav-menu[open]").forEach((menu) => {
    menu.open = false;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  document.querySelectorAll(".nav-menu[open]").forEach((menu) => {
    menu.open = false;
  });
});
