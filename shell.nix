{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = [
        pkgs.bun
        pkgs.git
        pkgs.nodejs
        pkgs.nodePackages.vercel
    ];
}
