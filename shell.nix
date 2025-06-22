let
    pkgs = import (builtins.fetchTarball {
        # Nixpkgs tarball with Bun v1.2.12
        url = "https://github.com/NixOS/nixpkgs/archive/1fd34d549fb564170b001eb8bbbdc60e11935359.tar.gz";
        sha256 = "179qx6jp9gbs51nk4czv8g8x0ms11x98viv4zca6azq82cnmdgrk";
    }) {};
in pkgs.mkShell {
    buildInputs = [
        pkgs.bun
        pkgs.git
        pkgs.nodejs
        pkgs.nodePackages.vercel
    ];
}
