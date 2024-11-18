{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        git
        nodejs_20
        nodejs_20.pkgs.pnpm
    ];

    NODE_ENV="development";
}